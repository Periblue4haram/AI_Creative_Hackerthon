package com.aidiary.community;

import com.aidiary.ai.AiGateway;
import com.aidiary.ai.AiUnavailableException;
import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import com.aidiary.common.PageResponse;
import com.aidiary.common.Times;
import com.aidiary.community.CommunityDtos.Author;
import com.aidiary.community.CommunityDtos.PublicDiary;
import com.aidiary.community.CommunityDtos.PublicPage;
import com.aidiary.community.CommunityDtos.ReactionResponse;
import com.aidiary.community.CommunityDtos.ReactionType;
import com.aidiary.community.CommunityDtos.ReportRequest;
import com.aidiary.community.CommunityDtos.SearchItem;
import com.aidiary.community.CommunityDtos.SearchResponse;
import com.aidiary.community.EmbeddingRepository.StoredEmbedding;
import com.aidiary.config.AppProperties;
import com.aidiary.diary.Diary;
import com.aidiary.diary.DiaryEnums.ImageSource;
import com.aidiary.diary.DiaryEnums.PageVisibility;
import com.aidiary.diary.DiaryPage;
import com.aidiary.diary.DiaryPageRepository;
import com.aidiary.diary.DiaryRepository;
import com.aidiary.geo.Region;
import com.aidiary.image.ImageUrls;
import com.aidiary.image.PageImage;
import com.aidiary.image.PageImage.Kind;
import com.aidiary.image.PageImageRepository;
import com.aidiary.user.User;
import com.aidiary.user.UserRepository;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class CommunityService {

    private static final Logger log = LoggerFactory.getLogger(CommunityService.class);
    private static final int BLOCK_REPORT_COUNT = 3;

    private final JdbcClient jdbc;
    private final DiaryRepository diaries;
    private final DiaryPageRepository pages;
    private final PageImageRepository images;
    private final UserRepository users;
    private final EmbeddingRepository embeddings;
    private final ImageUrls urls;
    private final AiGateway ai;
    private final AppProperties props;
    private final TransactionTemplate tx;

    public CommunityService(
            JdbcClient jdbc,
            DiaryRepository diaries,
            DiaryPageRepository pages,
            PageImageRepository images,
            UserRepository users,
            EmbeddingRepository embeddings,
            ImageUrls urls,
            AiGateway ai,
            AppProperties props,
            PlatformTransactionManager transactionManager) {
        this.jdbc = jdbc;
        this.diaries = diaries;
        this.pages = pages;
        this.images = images;
        this.users = users;
        this.embeddings = embeddings;
        this.urls = urls;
        this.ai = ai;
        this.props = props;
        this.tx = new TransactionTemplate(transactionManager);
    }

    /** 표시되는 페이지의 (좋아요 수 - 싫어요 수) 합이 큰 일기부터 내려준다. */
    public PageResponse<PublicDiary> feed(Long userId, Region region, int page, int size) {
        String regionFilter = region == null ? "" : " AND p.region = :region";
        String joins = " FROM diaries d JOIN diary_pages p ON p.diary_id = d.id WHERE " + PublicPages.SQL_CONDITION + regionFilter;

        var countQuery = jdbc.sql("SELECT COUNT(DISTINCT d.id)" + joins);
        var idQuery = jdbc.sql("""
                SELECT d.id
                FROM diaries d
                JOIN diary_pages p ON p.diary_id = d.id
                LEFT JOIN page_reactions r ON r.page_id = p.id
                WHERE
                """ + PublicPages.SQL_CONDITION + regionFilter + """

                GROUP BY d.id, d.published_at
                ORDER BY COALESCE(SUM(CASE r.type WHEN 'LIKE' THEN 1 WHEN 'DISLIKE' THEN -1 END), 0) DESC,
                         d.published_at DESC, d.id DESC
                LIMIT :size OFFSET :offset
                """);
        if (region != null) {
            countQuery = countQuery.param("region", region.name());
            idQuery = idQuery.param("region", region.name());
        }
        long total = countQuery.query(Long.class).single();
        List<Long> ids = idQuery.param("size", size)
                .param("offset", (long) page * size)
                .query(Long.class)
                .list();
        return PageResponse.of(toPublicDiaries(userId, ids, region), page, size, total);
    }

    public PublicDiary detail(Long userId, Long diaryId, Region region) {
        List<PublicDiary> result = toPublicDiaries(userId, List.of(diaryId), region);
        if (result.isEmpty()) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        return result.getFirst();
    }

    /** 유사도 기준을 넘는 페이지를 유사도가 높은 순으로만 내려준다. 좋아요와 싫어요는 순서에 영향을 주지 않는다. */
    public SearchResponse search(Long userId, String query, Region region, int limit) {
        float[] queryVector;
        try {
            queryVector = EmbeddingRepository.normalize(ai.embedQuery(query));
        } catch (AiUnavailableException e) {
            log.warn("검색어 임베딩 실패: {}", e.getMessage());
            throw new ApiException(ErrorCode.SEARCH_AI_UNAVAILABLE);
        }
        record Scored(Long pageId, double similarity) {}
        List<Long> pageIds = embeddings
                .findPublic(region, props.gemini().embeddingModel(), queryVector.length)
                .stream()
                .map(e -> new Scored(e.pageId(), dot(queryVector, e)))
                .filter(s -> s.similarity() >= props.searchMinSimilarity())
                .sorted(Comparator.comparingDouble(Scored::similarity).reversed())
                .limit(limit)
                .map(Scored::pageId)
                .toList();
        if (pageIds.isEmpty()) {
            return new SearchResponse(List.of());
        }

        Map<Long, DiaryPage> pagesById =
                pages.findAllById(pageIds).stream().collect(Collectors.toMap(p -> p.id, Function.identity()));
        Map<Long, Diary> diariesById = diaries.findAllById(pagesById.values().stream().map(p -> p.diaryId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(d -> d.id, Function.identity()));
        Map<Long, Author> authors = authors(diariesById.values());
        Map<Long, PublicPage> publicPages = toPublicPages(userId, pagesById.values(), diariesById).stream()
                .collect(Collectors.toMap(PublicPage::id, Function.identity()));

        List<SearchItem> items = new ArrayList<>();
        for (Long pageId : pageIds) {
            PublicPage page = publicPages.get(pageId);
            if (page != null) {
                Diary diary = diariesById.get(page.diaryId());
                items.add(new SearchItem(authors.get(diary.userId), page));
            }
        }
        return new SearchResponse(items);
    }

    public ReactionResponse react(Long userId, Long pageId, ReactionType type) {
        requirePublic(pageId);
        jdbc.sql("""
                        INSERT INTO page_reactions (page_id, user_id, type) VALUES (:pageId, :userId, :type)
                        ON DUPLICATE KEY UPDATE type = VALUES(type)
                        """)
                .param("pageId", pageId)
                .param("userId", userId)
                .param("type", type.name())
                .update();
        return new ReactionResponse(type);
    }

    public ReactionResponse removeReaction(Long userId, Long pageId) {
        requirePublic(pageId);
        jdbc.sql("DELETE FROM page_reactions WHERE page_id = :pageId AND user_id = :userId")
                .param("pageId", pageId)
                .param("userId", userId)
                .update();
        return new ReactionResponse(null);
    }

    public void report(Long userId, Long pageId, ReportRequest request) {
        try {
            tx.executeWithoutResult(s -> {
                DiaryPage page = pages.lockById(pageId).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
                Diary diary = diaries.findById(page.diaryId).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
                if (!PublicPages.isPublic(diary, page)) {
                    throw new ApiException(ErrorCode.NOT_FOUND);
                }
                if (diary.userId.equals(userId)) {
                    throw new ApiException(ErrorCode.CANNOT_REPORT_OWN_PAGE);
                }
                jdbc.sql("""
                                INSERT INTO page_reports (page_id, reporter_id, reason, detail)
                                VALUES (:pageId, :userId, :reason, :detail)
                                """)
                        .param("pageId", pageId)
                        .param("userId", userId)
                        .param("reason", request.reason().name())
                        .param("detail", request.detail())
                        .update();
                long count = jdbc.sql("SELECT COUNT(*) FROM page_reports WHERE page_id = :pageId")
                        .param("pageId", pageId)
                        .query(Long.class)
                        .single();
                if (count >= BLOCK_REPORT_COUNT) {
                    page.reportBlockedAt = Times.now();
                }
            });
        } catch (DuplicateKeyException e) {
            throw new ApiException(ErrorCode.ALREADY_REPORTED);
        }
    }

    private void requirePublic(Long pageId) {
        long count = jdbc.sql("""
                        SELECT COUNT(*) FROM diary_pages p JOIN diaries d ON d.id = p.diary_id
                        WHERE p.id = :pageId AND
                        """ + PublicPages.SQL_CONDITION)
                .param("pageId", pageId)
                .query(Long.class)
                .single();
        if (count == 0) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
    }

    private List<PublicDiary> toPublicDiaries(Long userId, List<Long> diaryIds, Region region) {
        if (diaryIds.isEmpty()) {
            return List.of();
        }
        Map<Long, Diary> diariesById =
                diaries.findAllById(diaryIds).stream().collect(Collectors.toMap(d -> d.id, Function.identity()));
        List<DiaryPage> candidates = pages.findByDiaryIdInOrderBySortOrderAscIdAsc(diaryIds).stream()
                .filter(p -> region == null || p.region == region)
                .toList();
        Map<Long, List<PublicPage>> pagesByDiary = toPublicPages(userId, candidates, diariesById).stream()
                .collect(Collectors.groupingBy(PublicPage::diaryId));
        Map<Long, Author> authors = authors(diariesById.values());

        List<PublicDiary> result = new ArrayList<>();
        for (Long diaryId : diaryIds) {
            List<PublicPage> visible = pagesByDiary.get(diaryId);
            if (visible != null) {
                Diary diary = diariesById.get(diaryId);
                result.add(new PublicDiary(
                        diaryId,
                        authors.get(diary.userId),
                        diary.logicalDate,
                        Times.offset(diary.publishedAt),
                        visible));
            }
        }
        return result;
    }

    /** 입력 순서를 유지하면서 공개 조건을 통과한 페이지만 변환한다. */
    private List<PublicPage> toPublicPages(Long userId, Collection<DiaryPage> candidates, Map<Long, Diary> diariesById) {
        List<DiaryPage> visible = candidates.stream()
                .filter(p -> diariesById.containsKey(p.diaryId) && PublicPages.isPublic(diariesById.get(p.diaryId), p))
                .toList();
        if (visible.isEmpty()) {
            return List.of();
        }
        List<Long> ids = visible.stream().map(p -> p.id).toList();
        Map<Long, List<PageImage>> imagesByPage =
                images.findByPageIdIn(ids).stream().collect(Collectors.groupingBy(i -> i.pageId));
        Map<Long, ReactionType> mine = myReactions(userId, ids);
        return visible.stream()
                .map(p -> toPublicPage(p, diariesById.get(p.diaryId), imagesByPage.getOrDefault(p.id, List.of()), mine.get(p.id)))
                .toList();
    }

    private PublicPage toPublicPage(DiaryPage page, Diary diary, List<PageImage> pageImages, ReactionType myReaction) {
        boolean hidden = page.visibility == PageVisibility.PHOTO_HIDDEN;
        ImageSource source = hidden ? null : page.imageSource;
        String imageUrl = hidden ? null : displayUrl(page, pageImages);
        return new PublicPage(
                page.id,
                page.diaryId,
                page.sortOrder,
                page.region,
                diary.logicalDate,
                imageUrl,
                source,
                hidden,
                page.content,
                myReaction);
    }

    private String displayUrl(DiaryPage page, List<PageImage> pageImages) {
        Kind kind = page.imageSource == ImageSource.ORIGINAL ? Kind.ORIGINAL : Kind.CONVERTED;
        return pageImages.stream()
                .filter(i -> i.kind == kind)
                .findFirst()
                .map(i -> urls.signedUrl(i.id))
                .orElse(null);
    }

    private Map<Long, ReactionType> myReactions(Long userId, List<Long> pageIds) {
        Map<Long, ReactionType> result = new HashMap<>();
        jdbc.sql("SELECT page_id, type FROM page_reactions WHERE user_id = :userId AND page_id IN (:pageIds)")
                .param("userId", userId)
                .param("pageIds", pageIds)
                .query((rs, n) -> result.put(rs.getLong(1), ReactionType.valueOf(rs.getString(2))))
                .list();
        return result;
    }

    /** 닉네임은 중복될 수 있으므로 작성자 구분은 닉네임이 아니라 일기 단위로 한다. */
    private Map<Long, Author> authors(Collection<Diary> list) {
        return users.findAllById(list.stream().map(d -> d.userId).distinct().toList()).stream()
                .collect(Collectors.toMap(u -> u.id, (User u) -> new Author(
                        u.nickname,
                        u.profileImagePath == null
                                ? null
                                : urls.signedUserImageUrl(ImageUrls.UserImage.PROFILE, u.id, u.profileImageVersion))));
    }

    private static double dot(float[] query, StoredEmbedding stored) {
        double sum = 0;
        float[] vector = stored.vector();
        for (int i = 0; i < query.length; i++) {
            sum += query[i] * vector[i];
        }
        return sum;
    }
}

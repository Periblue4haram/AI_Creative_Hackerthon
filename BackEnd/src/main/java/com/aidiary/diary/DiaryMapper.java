package com.aidiary.diary;

import com.aidiary.common.Times;
import com.aidiary.diary.DiaryDtos.DiarySummary;
import com.aidiary.diary.DiaryDtos.OwnerDiary;
import com.aidiary.diary.DiaryDtos.OwnerPage;
import com.aidiary.diary.DiaryEnums.ImageSource;
import com.aidiary.diary.DiaryEnums.MetadataIssue;
import com.aidiary.image.ImageUrls;
import com.aidiary.image.PageImage;
import com.aidiary.image.PageImage.Kind;
import com.aidiary.image.PageImageRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class DiaryMapper {

    private static final int PREVIEW_CHARS = 100;

    private final DiaryPageRepository pages;
    private final PageImageRepository images;
    private final ImageUrls urls;

    public DiaryMapper(DiaryPageRepository pages, PageImageRepository images, ImageUrls urls) {
        this.pages = pages;
        this.images = images;
        this.urls = urls;
    }

    public OwnerDiary toOwnerDiary(Diary diary) {
        List<DiaryPage> diaryPages = pages.findByDiaryIdOrderBySortOrderAscIdAsc(diary.id);
        Map<Long, List<PageImage>> imagesByPage = images
                .findByPageIdIn(diaryPages.stream().map(p -> p.id).toList())
                .stream()
                .collect(Collectors.groupingBy(i -> i.pageId));
        LocalDate reference = referenceDate(diary, diaryPages);
        return new OwnerDiary(
                diary.id,
                diary.status,
                diary.logicalDate,
                diary.visibility,
                diary.templateId,
                Times.offset(diary.publishedAt),
                Times.offset(diary.completedAt),
                diaryPages.stream()
                        .map(p -> toOwnerPage(p, imagesByPage.getOrDefault(p.id, List.of()), reference))
                        .toList());
    }

    public OwnerPage toOwnerPage(DiaryPage page, Diary diary) {
        return toOwnerPage(
                page,
                images.findByPageId(page.id),
                referenceDate(diary, pages.findByDiaryIdOrderBySortOrderAscIdAsc(diary.id)));
    }

    public List<DiarySummary> toSummaries(Collection<Diary> diaries) {
        if (diaries.isEmpty()) {
            return List.of();
        }
        Map<Long, List<DiaryPage>> pagesByDiary = pages
                .findByDiaryIdInOrderBySortOrderAscIdAsc(diaries.stream().map(d -> d.id).toList())
                .stream()
                .collect(Collectors.groupingBy(p -> p.diaryId));
        List<Long> firstPageIds = pagesByDiary.values().stream().map(l -> l.getFirst().id).toList();
        Map<Long, List<PageImage>> imagesByPage =
                images.findByPageIdIn(firstPageIds).stream().collect(Collectors.groupingBy(i -> i.pageId));
        List<DiarySummary> summaries = new ArrayList<>();
        for (Diary diary : diaries) {
            List<DiaryPage> list = pagesByDiary.getOrDefault(diary.id, List.of());
            DiaryPage first = list.isEmpty() ? null : list.getFirst();
            summaries.add(new DiarySummary(
                    diary.id,
                    diary.logicalDate,
                    diary.visibility,
                    list.size(),
                    list.stream().map(p -> p.region).filter(Objects::nonNull).distinct().toList(),
                    first == null ? null : displayUrl(first, imagesByPage.getOrDefault(first.id, List.of())),
                    first == null ? null : preview(first.content),
                    Times.offset(diary.completedAt)));
        }
        return summaries;
    }

    /** 일기 확정 전에는 가장 많은 사진의 날짜를 기준으로 어긋난 페이지를 표시한다. */
    public static LocalDate referenceDate(Diary diary, List<DiaryPage> pages) {
        if (diary.logicalDate != null) {
            return diary.logicalDate;
        }
        Map<LocalDate, Long> counts = pages.stream()
                .map(p -> p.logicalDate)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(Function.identity(), HashMap::new, Collectors.counting()));
        return counts.entrySet().stream()
                .max(Map.Entry.<LocalDate, Long>comparingByValue()
                        .thenComparing(Map.Entry.comparingByKey(Comparator.reverseOrder())))
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    public static List<MetadataIssue> issues(DiaryPage page, LocalDate reference) {
        List<MetadataIssue> issues = new ArrayList<>();
        if (page.logicalDate == null) {
            issues.add(MetadataIssue.DATE_REQUIRED);
        } else if (reference != null && !reference.equals(page.logicalDate)) {
            issues.add(MetadataIssue.DATE_MISMATCH);
        }
        if (page.locationSource == null) {
            issues.add(MetadataIssue.LOCATION_REQUIRED);
        }
        return issues;
    }

    private OwnerPage toOwnerPage(DiaryPage page, List<PageImage> pageImages, LocalDate reference) {
        return new OwnerPage(
                page.id,
                page.sortOrder,
                Times.offset(page.takenAt),
                page.logicalDate,
                page.dateSource,
                page.region,
                page.locationSource,
                url(pageImages, Kind.ORIGINAL),
                url(pageImages, Kind.CONVERTED),
                page.imageStatus,
                page.imageSource,
                page.imageError,
                page.chatStatus,
                page.estimatedChars,
                page.content,
                page.visibility,
                page.isShareable(),
                page.reportBlockedAt != null,
                issues(page, reference));
    }

    private String displayUrl(DiaryPage page, List<PageImage> pageImages) {
        return url(pageImages, page.imageSource == ImageSource.ORIGINAL ? Kind.ORIGINAL : Kind.CONVERTED);
    }

    private String url(List<PageImage> pageImages, Kind kind) {
        return pageImages.stream()
                .filter(i -> i.kind == kind)
                .findFirst()
                .map(i -> urls.signedUrl(i.id))
                .orElse(null);
    }

    private static String preview(String content) {
        if (content == null) {
            return null;
        }
        return content.length() <= PREVIEW_CHARS ? content : content.substring(0, PREVIEW_CHARS) + "...";
    }
}

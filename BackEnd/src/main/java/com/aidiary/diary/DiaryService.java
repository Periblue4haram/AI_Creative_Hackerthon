package com.aidiary.diary;

import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import com.aidiary.common.PageResponse;
import com.aidiary.common.Times;
import com.aidiary.community.EmbeddingRepository;
import com.aidiary.diary.DiaryAccess.PageAndDiary;
import com.aidiary.diary.DiaryDtos.CompletePage;
import com.aidiary.diary.DiaryDtos.CompleteRequest;
import com.aidiary.diary.DiaryDtos.DiarySummary;
import com.aidiary.diary.DiaryDtos.LocationInput;
import com.aidiary.diary.DiaryDtos.MetadataRequest;
import com.aidiary.diary.DiaryDtos.OwnerDiary;
import com.aidiary.diary.DiaryDtos.OwnerPage;
import com.aidiary.diary.DiaryDtos.UpdateDiaryRequest;
import com.aidiary.diary.DiaryDtos.UpdatePageRequest;
import com.aidiary.diary.DiaryEnums.DateSource;
import com.aidiary.diary.DiaryEnums.DiaryStatus;
import com.aidiary.diary.DiaryEnums.DiaryVisibility;
import com.aidiary.diary.DiaryEnums.ImageSource;
import com.aidiary.diary.DiaryEnums.ImageStatus;
import com.aidiary.diary.DiaryEnums.LocationSource;
import com.aidiary.diary.DiaryEnums.PageVisibility;
import com.aidiary.geo.GeoLocator;
import com.aidiary.geo.GeoLocator.GeoResult;
import com.aidiary.geo.Region;
import com.aidiary.image.ImageStorage;
import com.aidiary.image.PageImage;
import com.aidiary.image.PageImage.Kind;
import com.aidiary.image.PageImageRepository;
import com.aidiary.image.PhotoProcessor;
import com.aidiary.image.ProcessedPhoto;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DiaryService {

    private static final int MAX_PAGES = 4;
    private static final String JPEG_EXTENSION = "jpg";

    private record PreparedPhoto(ProcessedPhoto photo, GeoResult geo) {}

    private final DiaryRepository diaries;
    private final DiaryPageRepository pages;
    private final PageImageRepository images;
    private final ChatMessageRepository messages;
    private final EmbeddingRepository embeddings;
    private final ImageStorage storage;
    private final PhotoProcessor processor;
    private final GeoLocator geo;
    private final ConversionService conversion;
    private final DiaryAccess access;
    private final DiaryMapper mapper;
    private final TransactionTemplate tx;

    public DiaryService(
            DiaryRepository diaries,
            DiaryPageRepository pages,
            PageImageRepository images,
            ChatMessageRepository messages,
            EmbeddingRepository embeddings,
            ImageStorage storage,
            PhotoProcessor processor,
            GeoLocator geo,
            ConversionService conversion,
            DiaryAccess access,
            DiaryMapper mapper,
            PlatformTransactionManager transactionManager) {
        this.diaries = diaries;
        this.pages = pages;
        this.images = images;
        this.messages = messages;
        this.embeddings = embeddings;
        this.storage = storage;
        this.processor = processor;
        this.geo = geo;
        this.conversion = conversion;
        this.access = access;
        this.mapper = mapper;
        this.tx = new TransactionTemplate(transactionManager);
    }

    // ---------- 업로드와 메타데이터 ----------

    public OwnerDiary create(Long userId, List<MultipartFile> files) {
        if (files.isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        if (files.size() > MAX_PAGES) {
            throw new ApiException(ErrorCode.PAGE_LIMIT_EXCEEDED);
        }
        List<PreparedPhoto> prepared = files.stream().map(this::prepare).toList();
        rejectOutsideRegions(prepared);

        List<String> written = new ArrayList<>();
        Long diaryId;
        try {
            diaryId = tx.execute(s -> {
                Diary diary = diaries.saveAndFlush(new Diary(userId));
                for (int i = 0; i < prepared.size(); i++) {
                    DiaryPage page = new DiaryPage(diary.id, i);
                    applyPhoto(page, prepared.get(i));
                    pages.saveAndFlush(page);
                    written.add(storeOriginal(diary.id, page.id, prepared.get(i).photo()));
                }
                return diary.id;
            });
        } catch (RuntimeException e) {
            written.forEach(storage::deleteQuietly);
            throw e;
        }
        return mapper.toOwnerDiary(diaries.findById(diaryId).orElseThrow());
    }

    public OwnerPage addPage(Long userId, Long diaryId, MultipartFile file) {
        access.readable(userId, diaryId);
        PreparedPhoto prepared = prepare(file);
        rejectOutsideRegions(List.of(prepared));
        List<String> written = new ArrayList<>();
        Long pageId;
        try {
            pageId = tx.execute(s -> {
                Diary diary = access.writable(userId, diaryId);
                requireStatus(diary, DiaryStatus.METADATA_PENDING);
                List<DiaryPage> existing = access.pagesOf(diaryId);
                if (existing.size() >= MAX_PAGES) {
                    throw new ApiException(ErrorCode.PAGE_LIMIT_EXCEEDED);
                }
                int next = existing.stream().mapToInt(p -> p.sortOrder).max().orElse(-1) + 1;
                DiaryPage page = new DiaryPage(diaryId, next);
                applyPhoto(page, prepared);
                pages.saveAndFlush(page);
                written.add(storeOriginal(diaryId, page.id, prepared.photo()));
                return page.id;
            });
        } catch (RuntimeException e) {
            written.forEach(storage::deleteQuietly);
            throw e;
        }
        return ownerPage(pageId, diaryId);
    }

    public OwnerPage replacePhoto(Long userId, Long pageId, MultipartFile file) {
        access.readablePage(userId, pageId);
        PreparedPhoto prepared = prepare(file);
        rejectOutsideRegions(List.of(prepared));

        List<String> written = new ArrayList<>();
        record Replaced(Long diaryId, List<String> oldPaths) {}
        Replaced replaced;
        try {
            replaced = tx.execute(s -> {
                PageAndDiary target = access.writablePage(userId, pageId);
                requireNotCompleted(target.diary());
                DiaryPage page = target.page();

                List<PageImage> old = images.findByPageId(pageId);
                images.deleteAll(old);
                images.flush();
                messages.deleteByPageId(pageId);
                embeddings.delete(pageId);

                page.reset();
                applyPhoto(page, prepared);
                written.add(storeOriginal(page.diaryId, pageId, prepared.photo()));
                return new Replaced(page.diaryId, old.stream().map(i -> i.storagePath).toList());
            });
        } catch (RuntimeException e) {
            written.forEach(storage::deleteQuietly);
            throw e;
        }
        replaced.oldPaths().forEach(storage::deleteQuietly);
        startConversionIfReady(pageId);
        return ownerPage(pageId, replaced.diaryId());
    }

    public OwnerPage updateMetadata(Long userId, Long pageId, MetadataRequest request) {
        Long diaryId = tx.execute(s -> {
            PageAndDiary target = access.writablePage(userId, pageId);
            requireNotCompleted(target.diary());
            applyDate(target.page(), request);
            if (request.location() != null) {
                applyLocation(target.page(), request.location());
            }
            return target.diary().id;
        });
        startConversionIfReady(pageId);
        return ownerPage(pageId, diaryId);
    }

    public void deletePage(Long userId, Long pageId) {
        List<String> paths = tx.execute(s -> {
            PageAndDiary target = access.writablePage(userId, pageId);
            requireNotCompleted(target.diary());
            if (pages.countByDiaryId(target.diary().id) <= 1) {
                throw new ApiException(ErrorCode.LAST_PAGE_CANNOT_BE_DELETED);
            }
            List<String> old = images.findByPageId(pageId).stream().map(i -> i.storagePath).toList();
            pages.delete(target.page());
            return old;
        });
        paths.forEach(storage::deleteQuietly);
    }

    public OwnerDiary confirm(Long userId, Long diaryId) {
        List<Long> pageIds = tx.execute(s -> {
            Diary diary = access.writable(userId, diaryId);
            requireStatus(diary, DiaryStatus.METADATA_PENDING);
            List<DiaryPage> list = access.pagesOf(diaryId);

            List<Long> incomplete =
                    list.stream().filter(p -> !p.isMetadataComplete()).map(p -> p.id).toList();
            if (!incomplete.isEmpty()) {
                throw new ApiException(ErrorCode.METADATA_INCOMPLETE, Map.of("pageIds", incomplete));
            }
            LocalDate reference = DiaryMapper.referenceDate(diary, list);
            List<Long> mismatched = list.stream()
                    .filter(p -> !reference.equals(p.logicalDate))
                    .map(p -> p.id)
                    .toList();
            if (!mismatched.isEmpty()) {
                throw new ApiException(ErrorCode.DATE_MISMATCH, Map.of("pageIds", mismatched));
            }

            List<DiaryPage> sorted = list.stream()
                    .sorted(Comparator.comparing((DiaryPage p) -> p.takenAt, Comparator.nullsLast(Comparator.naturalOrder()))
                            .thenComparingInt(p -> p.sortOrder))
                    .toList();
            for (int i = 0; i < sorted.size(); i++) {
                sorted.get(i).sortOrder = i;
            }
            diary.logicalDate = reference;
            diary.status = DiaryStatus.CREATING;
            return sorted.stream().map(p -> p.id).toList();
        });
        pageIds.forEach(conversion::enqueue);
        return mapper.toOwnerDiary(diaries.findById(diaryId).orElseThrow());
    }

    // ---------- 이미지 변환 후속 처리 ----------

    public OwnerPage regenerateImage(Long userId, Long pageId) {
        Long diaryId = tx.execute(s -> {
            PageAndDiary target = access.writablePage(userId, pageId);
            requireStatus(target.diary(), DiaryStatus.CREATING);
            DiaryPage page = target.page();
            if (page.imageStatus != ImageStatus.FAILED && page.imageStatus != ImageStatus.DONE) {
                throw new ApiException(ErrorCode.INVALID_STATE);
            }
            page.imageStatus = ImageStatus.PENDING;
            return target.diary().id;
        });
        conversion.enqueue(pageId);
        return ownerPage(pageId, diaryId);
    }

    public OwnerPage useOriginalImage(Long userId, Long pageId) {
        Long diaryId = tx.execute(s -> {
            PageAndDiary target = access.writablePage(userId, pageId);
            requireStatus(target.diary(), DiaryStatus.CREATING);
            DiaryPage page = target.page();
            if (page.imageStatus != ImageStatus.FAILED) {
                throw new ApiException(ErrorCode.INVALID_STATE);
            }
            page.imageStatus = ImageStatus.DONE;
            page.imageSource = ImageSource.ORIGINAL;
            page.imageError = null;
            return target.diary().id;
        });
        return ownerPage(pageId, diaryId);
    }

    // ---------- 저장 ----------

    public OwnerDiary complete(Long userId, Long diaryId, CompleteRequest request) {
        tx.executeWithoutResult(s -> {
            Diary diary = access.writable(userId, diaryId);
            requireStatus(diary, DiaryStatus.CREATING);
            List<DiaryPage> list = access.pagesOf(diaryId);
            Map<Long, DiaryPage> byId = list.stream().collect(Collectors.toMap(p -> p.id, Function.identity()));

            List<CompletePage> updates = request.pages() == null ? List.of() : request.pages();
            List<Long> notShareable = new ArrayList<>();
            for (CompletePage update : updates) {
                DiaryPage page = byId.get(update.id());
                if (page == null) {
                    throw new ApiException(ErrorCode.VALIDATION_FAILED);
                }
                if (update.content() != null) {
                    page.content = update.content();
                }
                if (update.visibility() != null) {
                    if (update.visibility() != PageVisibility.PRIVATE && !page.isShareable()) {
                        notShareable.add(page.id);
                    } else {
                        page.visibility = update.visibility();
                    }
                }
            }
            if (!notShareable.isEmpty()) {
                throw new ApiException(ErrorCode.PAGE_NOT_SHAREABLE, Map.of("pageIds", notShareable));
            }
            List<Long> incomplete = list.stream()
                    .filter(p -> p.imageStatus != ImageStatus.DONE
                            || p.content == null
                            || !DiaryMapper.issues(p, diary.logicalDate).isEmpty())
                    .map(p -> p.id)
                    .toList();
            if (!incomplete.isEmpty()) {
                throw new ApiException(ErrorCode.DIARY_INCOMPLETE, Map.of("pageIds", incomplete));
            }

            LocalDateTime now = Times.now();
            diary.status = DiaryStatus.COMPLETED;
            diary.completedAt = now;
            if (request.templateId() != null) {
                diary.templateId = request.templateId();
            }
            applyDiaryVisibility(diary, request.visibility(), now);
        });
        return mapper.toOwnerDiary(diaries.findById(diaryId).orElseThrow());
    }

    // ---------- 조회와 관리 ----------

    public OwnerDiary get(Long userId, Long diaryId) {
        return mapper.toOwnerDiary(access.readable(userId, diaryId));
    }

    public PageResponse<DiarySummary> listMine(Long userId, int page, int size) {
        Sort sort = Sort.by(Sort.Order.desc("logicalDate"), Sort.Order.desc("completedAt"), Sort.Order.desc("id"));
        Page<Diary> result = diaries.findByUserIdAndStatus(userId, DiaryStatus.COMPLETED, PageRequest.of(page, size, sort));
        return PageResponse.of(mapper.toSummaries(result.getContent()), page, size, result.getTotalElements());
    }

    public OwnerDiary updateDiary(Long userId, Long diaryId, UpdateDiaryRequest request) {
        tx.executeWithoutResult(s -> {
            Diary diary = access.writable(userId, diaryId);
            requireStatus(diary, DiaryStatus.COMPLETED);
            if (request.templateId() != null) {
                diary.templateId = request.templateId();
            }
            if (request.visibility() != null) {
                applyDiaryVisibility(diary, request.visibility(), Times.now());
            }
            if (request.pages() != null) {
                applyPageVisibilities(diaryId, request.pages());
            }
        });
        return mapper.toOwnerDiary(diaries.findById(diaryId).orElseThrow());
    }

    /** 하나라도 공개할 수 없는 페이지가 있으면 아무것도 바꾸지 않는다. */
    private void applyPageVisibilities(Long diaryId, List<DiaryDtos.PageVisibilityUpdate> updates) {
        Map<Long, DiaryPage> byId = access.pagesOf(diaryId).stream()
                .collect(Collectors.toMap(p -> p.id, Function.identity()));
        List<Long> notShareable = new ArrayList<>();
        for (DiaryDtos.PageVisibilityUpdate update : updates) {
            DiaryPage page = byId.get(update.id());
            if (page == null) {
                throw new ApiException(ErrorCode.VALIDATION_FAILED);
            }
            if (update.visibility() != PageVisibility.PRIVATE) {
                if (!page.isShareable()) {
                    notShareable.add(page.id);
                } else if (page.reportBlockedAt != null) {
                    throw new ApiException(ErrorCode.PAGE_REPORT_BLOCKED);
                }
            }
        }
        if (!notShareable.isEmpty()) {
            throw new ApiException(ErrorCode.PAGE_NOT_SHAREABLE, Map.of("pageIds", notShareable));
        }
        updates.forEach(u -> byId.get(u.id()).visibility = u.visibility());
    }

    public OwnerPage updatePage(Long userId, Long pageId, UpdatePageRequest request) {
        Long diaryId = tx.execute(s -> {
            PageAndDiary target = access.writablePage(userId, pageId);
            if (target.diary().status == DiaryStatus.METADATA_PENDING) {
                throw new ApiException(ErrorCode.INVALID_STATE);
            }
            DiaryPage page = target.page();
            if (request.visibility() != null && request.visibility() != PageVisibility.PRIVATE) {
                if (!page.isShareable()) {
                    throw new ApiException(ErrorCode.PAGE_NOT_SHAREABLE, Map.of("pageIds", List.of(pageId)));
                }
                if (page.reportBlockedAt != null) {
                    throw new ApiException(ErrorCode.PAGE_REPORT_BLOCKED);
                }
            }
            if (request.visibility() != null) {
                page.visibility = request.visibility();
            }
            if (request.content() != null && !request.content().equals(page.content)) {
                page.content = request.content();
                embeddings.delete(pageId);
            }
            return target.diary().id;
        });
        return ownerPage(pageId, diaryId);
    }

    public void deleteDiary(Long userId, Long diaryId) {
        List<String> paths = tx.execute(s -> {
            Diary diary = access.writable(userId, diaryId);
            List<Long> pageIds = access.pagesOf(diaryId).stream().map(p -> p.id).toList();
            List<String> old = images.findByPageIdIn(pageIds).stream().map(i -> i.storagePath).toList();
            diaries.delete(diary);
            return old;
        });
        paths.forEach(storage::deleteQuietly);
    }

    // ---------- 내부 ----------

    private PreparedPhoto prepare(MultipartFile file) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        ProcessedPhoto photo = processor.process(bytes);
        GeoResult result = photo.hasLocation()
                ? geo.locate(photo.latitude(), photo.longitude())
                : GeoResult.unavailable();
        return new PreparedPhoto(photo, result);
    }

    private static void rejectOutsideRegions(List<PreparedPhoto> prepared) {
        List<Integer> outside = new ArrayList<>();
        for (int i = 0; i < prepared.size(); i++) {
            if (prepared.get(i).geo().status() == GeoResult.Status.OUTSIDE) {
                outside.add(i);
            }
        }
        if (!outside.isEmpty()) {
            throw new ApiException(ErrorCode.REGION_NOT_SUPPORTED, Map.of("fileIndexes", outside));
        }
    }

    private static void applyPhoto(DiaryPage page, PreparedPhoto prepared) {
        if (prepared.photo().takenAt() != null) {
            page.takenAt = prepared.photo().takenAt();
            page.logicalDate = Times.logicalDate(page.takenAt);
            page.dateSource = DateSource.EXIF;
        }
        if (prepared.geo().status() == GeoResult.Status.SUPPORTED) {
            page.region = prepared.geo().region();
            page.locationSource = LocationSource.EXIF;
        }
    }

    private String storeOriginal(Long diaryId, Long pageId, ProcessedPhoto photo) {
        String path = storage.write(diaryId, pageId, JPEG_EXTENSION, photo.jpeg());
        images.saveAndFlush(new PageImage(pageId, Kind.ORIGINAL, MediaType.IMAGE_JPEG_VALUE, photo.jpeg().length, path));
        return path;
    }

    private static void applyDate(DiaryPage page, MetadataRequest request) {
        if (request.date() == null && request.time() == null) {
            return;
        }
        LocalDate date = request.date();
        if (date == null) {
            // 시간만 보낸 경우 이미 알고 있는 날짜에 붙인다
            if (page.takenAt != null) {
                date = page.takenAt.toLocalDate();
            } else if (page.logicalDate != null) {
                date = page.logicalDate;
            } else {
                throw new ApiException(ErrorCode.VALIDATION_FAILED);
            }
        }
        page.dateSource = DateSource.USER_INPUT;
        if (request.time() == null) {
            page.takenAt = null;
            page.logicalDate = date;
        } else {
            page.takenAt = date.atTime(request.time());
            page.logicalDate = Times.logicalDate(page.takenAt);
        }
    }

    private static void applyLocation(DiaryPage page, LocationInput input) {
        boolean unknown = Boolean.TRUE.equals(input.unknown());
        boolean hasDistrict = input.district() != null;
        if (unknown == hasDistrict) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        if (unknown) {
            page.region = null;
            page.locationSource = LocationSource.UNKNOWN;
            page.visibility = PageVisibility.PRIVATE;
            return;
        }
        Region region = Region.fromDistrict(input.district())
                .orElseThrow(() -> new ApiException(ErrorCode.REGION_NOT_SUPPORTED));
        page.region = region;
        page.locationSource = LocationSource.USER_INPUT;
    }

    private void startConversionIfReady(Long pageId) {
        boolean ready = Boolean.TRUE.equals(tx.execute(s -> {
            DiaryPage page = pages.findById(pageId).orElse(null);
            if (page == null || page.imageStatus != ImageStatus.PENDING || !page.isMetadataComplete()) {
                return false;
            }
            Diary diary = diaries.findById(page.diaryId).orElseThrow();
            return diary.status == DiaryStatus.CREATING && Objects.equals(diary.logicalDate, page.logicalDate);
        }));
        if (ready) {
            conversion.enqueue(pageId);
        }
    }

    private static void applyDiaryVisibility(Diary diary, DiaryVisibility visibility, LocalDateTime now) {
        diary.visibility = visibility;
        if (visibility == DiaryVisibility.PUBLIC && diary.publishedAt == null) {
            diary.publishedAt = now;
        }
    }

    private OwnerPage ownerPage(Long pageId, Long diaryId) {
        return mapper.toOwnerPage(pages.findById(pageId).orElseThrow(), diaries.findById(diaryId).orElseThrow());
    }

    private static void requireStatus(Diary diary, DiaryStatus status) {
        if (diary.status != status) {
            throw new ApiException(ErrorCode.INVALID_STATE);
        }
    }

    private static void requireNotCompleted(Diary diary) {
        if (diary.status == DiaryStatus.COMPLETED) {
            throw new ApiException(ErrorCode.INVALID_STATE);
        }
    }
}

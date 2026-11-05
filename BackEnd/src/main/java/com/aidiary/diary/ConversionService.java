package com.aidiary.diary;

import com.aidiary.ai.AiUnavailableException;
import com.aidiary.ai.ImageStyler;
import com.aidiary.ai.ImageStyler.GeneratedImage;
import com.aidiary.diary.DiaryEnums.DiaryStatus;
import com.aidiary.diary.DiaryEnums.ImageSource;
import com.aidiary.diary.DiaryEnums.ImageStatus;
import com.aidiary.image.ImageStorage;
import com.aidiary.image.PageImage;
import com.aidiary.image.PageImage.Kind;
import com.aidiary.image.PageImageRepository;
import com.aidiary.user.User;
import com.aidiary.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** 페이지별 이미지 변환. 실패하면 자동으로 1회 재시도한다. */
@Service
public class ConversionService {

    private static final Logger log = LoggerFactory.getLogger(ConversionService.class);
    private static final int MAX_TRIES = 2;
    private static final String FAILURE_MESSAGE = "이미지 변환에 실패했습니다.";

    /** facePath는 일기 주인이 얼굴 데이터를 등록하고 사용을 켜 둔 경우에만 값이 있다. */
    private record Job(Long diaryId, Long originalImageId, String originalPath, String facePath) {}

    private final DiaryRepository diaries;
    private final UserRepository users;
    private final DiaryPageRepository pages;
    private final PageImageRepository images;
    private final ImageStorage storage;
    private final ImageStyler styler;
    private final TaskExecutor executor;
    private final TransactionTemplate tx;

    public ConversionService(
            DiaryRepository diaries,
            UserRepository users,
            DiaryPageRepository pages,
            PageImageRepository images,
            ImageStorage storage,
            ImageStyler styler,
            TaskExecutor conversionExecutor,
            PlatformTransactionManager transactionManager) {
        this.diaries = diaries;
        this.users = users;
        this.pages = pages;
        this.images = images;
        this.storage = storage;
        this.styler = styler;
        this.executor = conversionExecutor;
        this.tx = new TransactionTemplate(transactionManager);
    }

    /** 커밋이 끝난 뒤 호출한다. 대기(PENDING) 상태의 페이지만 처리한다. */
    public void enqueue(Long pageId) {
        executor.execute(() -> {
            try {
                convert(pageId);
            } catch (RuntimeException e) {
                log.error("이미지 변환 작업 오류: page={}", pageId, e);
                markFailed(pageId, 0);
            }
        });
    }

    /** 서버가 멈췄을 때 남은 작업을 이어서 처리한다. */
    @EventListener(ApplicationReadyEvent.class)
    public void resumeAfterRestart() {
        tx.executeWithoutResult(s -> pages.updateImageStatus(ImageStatus.PROCESSING, ImageStatus.PENDING));
        pages.findReadyToConvert(DiaryStatus.CREATING, ImageStatus.PENDING).forEach(this::enqueue);
    }

    private void convert(Long pageId) {
        Job job = claim(pageId);
        if (job == null) {
            return;
        }
        byte[] photo = storage.read(job.originalPath());
        byte[] face = readFace(job.facePath());
        GeneratedImage generated = null;
        int tries = 0;
        while (generated == null && tries < MAX_TRIES) {
            tries++;
            try {
                generated = styler.toAnimeStyle(photo, face);
            } catch (AiUnavailableException e) {
                log.warn("이미지 변환 실패: page={}, try={}, {}", pageId, tries, e.getMessage());
            }
        }
        if (generated == null) {
            markFailed(pageId, tries);
            return;
        }
        save(pageId, job, generated, tries);
    }

    private Job claim(Long pageId) {
        return tx.execute(s -> {
            DiaryPage page = pages.lockById(pageId).orElse(null);
            if (page == null || page.imageStatus != ImageStatus.PENDING) {
                return null;
            }
            PageImage original = images.findByPageIdAndKind(pageId, Kind.ORIGINAL).orElse(null);
            if (original == null) {
                return null;
            }
            page.imageStatus = ImageStatus.PROCESSING;
            page.imageError = null;
            String facePath = diaries.findById(page.diaryId)
                    .flatMap(d -> users.findById(d.userId))
                    .filter(User::usesFaceData)
                    .map(u -> u.faceImagePath)
                    .orElse(null);
            return new Job(page.diaryId, original.id, original.storagePath, facePath);
        });
    }

    /** 얼굴 데이터를 읽지 못해도 변환은 얼굴 없이 계속한다. */
    private byte[] readFace(String facePath) {
        if (facePath == null) {
            return null;
        }
        try {
            return storage.read(facePath);
        } catch (RuntimeException e) {
            log.warn("얼굴 데이터를 읽지 못했습니다: {}", e.getMessage());
            return null;
        }
    }

    private void save(Long pageId, Job job, GeneratedImage generated, int tries) {
        String type = generated.contentType();
        String extension = type.contains("png") ? "png" : type.contains("webp") ? "webp" : "jpg";
        String path = storage.write(job.diaryId(), pageId, extension, generated.bytes());
        String stale;
        try {
            stale = tx.execute(s -> {
                DiaryPage page = pages.lockById(pageId).orElse(null);
                PageImage original = images.findByPageIdAndKind(pageId, Kind.ORIGINAL).orElse(null);
                // 변환 중에 사진이 교체되거나 페이지가 삭제되었으면 결과를 버린다
                if (page == null || original == null || !original.id.equals(job.originalImageId())) {
                    return path;
                }
                String previous = images.findByPageIdAndKind(pageId, Kind.CONVERTED)
                        .map(old -> {
                            images.delete(old);
                            images.flush();
                            return old.storagePath;
                        })
                        .orElse(null);
                images.save(new PageImage(pageId, Kind.CONVERTED, generated.contentType(), generated.bytes().length, path));
                page.imageStatus = ImageStatus.DONE;
                page.imageSource = ImageSource.CONVERTED;
                page.imageAttempts += tries;
                page.imageError = null;
                return previous;
            });
        } catch (RuntimeException e) {
            storage.deleteQuietly(path);
            throw e;
        }
        if (stale != null) {
            storage.deleteQuietly(stale);
        }
    }

    /** 재생성에 실패해도 이미 표시 중인 이미지가 있으면 그대로 유지한다. */
    private void markFailed(Long pageId, int tries) {
        tx.executeWithoutResult(s -> pages.lockById(pageId).ifPresent(page -> {
            page.imageStatus = page.imageSource == null ? ImageStatus.FAILED : ImageStatus.DONE;
            page.imageAttempts += tries;
            page.imageError = FAILURE_MESSAGE;
        }));
    }
}

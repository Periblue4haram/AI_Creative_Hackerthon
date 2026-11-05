package com.aidiary.diary;

import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import java.util.List;
import org.springframework.stereotype.Component;

/** 소유권 확인과 일기 조회를 한곳에 모은다. 읽기는 404, 쓰기는 403으로 응답한다. */
@Component
public class DiaryAccess {

    private final DiaryRepository diaries;
    private final DiaryPageRepository pages;

    public DiaryAccess(DiaryRepository diaries, DiaryPageRepository pages) {
        this.diaries = diaries;
        this.pages = pages;
    }

    public record PageAndDiary(DiaryPage page, Diary diary) {}

    public Diary readable(Long userId, Long diaryId) {
        return diaries.findById(diaryId)
                .filter(d -> d.userId.equals(userId))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    /** 트랜잭션 안에서 호출하면 일기 행을 잠근다. */
    public Diary writable(Long userId, Long diaryId) {
        Diary diary = diaries.lockById(diaryId).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        if (!diary.userId.equals(userId)) {
            throw new ApiException(ErrorCode.FORBIDDEN);
        }
        return diary;
    }

    public PageAndDiary readablePage(Long userId, Long pageId) {
        DiaryPage page = pages.findById(pageId).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        return new PageAndDiary(page, readable(userId, page.diaryId));
    }

    /** 일기를 먼저 잠근 뒤 페이지를 읽어 페이지 수 확인과 상태 변경이 겹치지 않게 한다. */
    public PageAndDiary writablePage(Long userId, Long pageId) {
        Long diaryId = pages.findById(pageId)
                .map(p -> p.diaryId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        Diary diary = writable(userId, diaryId);
        DiaryPage page = pages.lockById(pageId).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        return new PageAndDiary(page, diary);
    }

    public List<DiaryPage> pagesOf(Long diaryId) {
        return pages.findByDiaryIdOrderBySortOrderAscIdAsc(diaryId);
    }
}

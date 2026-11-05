package com.aidiary.community;

import com.aidiary.diary.Diary;
import com.aidiary.diary.DiaryEnums.DiaryStatus;
import com.aidiary.diary.DiaryEnums.DiaryVisibility;
import com.aidiary.diary.DiaryEnums.PageVisibility;
import com.aidiary.diary.DiaryPage;

/** 다른 사용자에게 보여도 되는 페이지의 조건. SQL과 Java가 같은 규칙을 쓰도록 한곳에 둔다. */
public final class PublicPages {

    /** diaries를 d, diary_pages를 p로 조인한 쿼리에서 쓴다. */
    public static final String SQL_CONDITION = """
            d.status = 'COMPLETED'
            AND d.visibility = 'PUBLIC'
            AND p.visibility IN ('PUBLIC', 'PHOTO_HIDDEN')
            AND p.report_blocked_at IS NULL
            """;

    private PublicPages() {}

    public static boolean isPublic(Diary diary, DiaryPage page) {
        return diary.status == DiaryStatus.COMPLETED
                && diary.visibility == DiaryVisibility.PUBLIC
                && page.visibility != PageVisibility.PRIVATE
                && page.reportBlockedAt == null;
    }
}

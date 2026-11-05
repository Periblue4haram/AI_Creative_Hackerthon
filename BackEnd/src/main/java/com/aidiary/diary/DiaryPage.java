package com.aidiary.diary;

import com.aidiary.diary.DiaryEnums.ChatStatus;
import com.aidiary.diary.DiaryEnums.DateSource;
import com.aidiary.diary.DiaryEnums.ImageSource;
import com.aidiary.diary.DiaryEnums.ImageStatus;
import com.aidiary.diary.DiaryEnums.LocationSource;
import com.aidiary.diary.DiaryEnums.PageVisibility;
import com.aidiary.geo.Region;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "diary_pages")
public class DiaryPage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "diary_id")
    public Long diaryId;

    @Column(name = "sort_order")
    public int sortOrder;

    @Column(name = "taken_at")
    public LocalDateTime takenAt;

    @Column(name = "logical_date")
    public LocalDate logicalDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "date_source")
    public DateSource dateSource;

    @Enumerated(EnumType.STRING)
    public Region region;

    @Enumerated(EnumType.STRING)
    @Column(name = "location_source")
    public LocationSource locationSource;

    @Enumerated(EnumType.STRING)
    @Column(name = "image_status")
    public ImageStatus imageStatus = ImageStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "image_source")
    public ImageSource imageSource;

    @Column(name = "image_attempts")
    public int imageAttempts;

    @Column(name = "image_error")
    public String imageError;

    @Enumerated(EnumType.STRING)
    @Column(name = "chat_status")
    public ChatStatus chatStatus = ChatStatus.NOT_STARTED;

    @Column(name = "estimated_chars")
    public int estimatedChars;

    public String content;

    @Enumerated(EnumType.STRING)
    public PageVisibility visibility = PageVisibility.PRIVATE;

    @Column(name = "report_blocked_at")
    public LocalDateTime reportBlockedAt;

    protected DiaryPage() {}

    public DiaryPage(Long diaryId, int sortOrder) {
        this.diaryId = diaryId;
        this.sortOrder = sortOrder;
    }

    public boolean isShareable() {
        return region != null;
    }

    public boolean isMetadataComplete() {
        return logicalDate != null && locationSource != null;
    }

    /** 사진을 교체할 때 메타데이터, 이미지, 대화, 글, 공개 설정을 처음 상태로 되돌린다. */
    public void reset() {
        takenAt = null;
        logicalDate = null;
        dateSource = null;
        region = null;
        locationSource = null;
        imageStatus = ImageStatus.PENDING;
        imageSource = null;
        imageAttempts = 0;
        imageError = null;
        chatStatus = ChatStatus.NOT_STARTED;
        estimatedChars = 0;
        content = null;
        visibility = PageVisibility.PRIVATE;
    }
}

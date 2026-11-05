package com.aidiary.diary;

import com.aidiary.diary.DiaryEnums.DiaryStatus;
import com.aidiary.diary.DiaryEnums.DiaryVisibility;
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
@Table(name = "diaries")
public class Diary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "user_id")
    public Long userId;

    @Column(name = "logical_date")
    public LocalDate logicalDate;

    @Enumerated(EnumType.STRING)
    public DiaryStatus status = DiaryStatus.METADATA_PENDING;

    @Enumerated(EnumType.STRING)
    public DiaryVisibility visibility = DiaryVisibility.PRIVATE;

    @Column(name = "template_id")
    public String templateId = "default";

    @Column(name = "published_at")
    public LocalDateTime publishedAt;

    @Column(name = "completed_at")
    public LocalDateTime completedAt;

    protected Diary() {}

    public Diary(Long userId) {
        this.userId = userId;
    }
}

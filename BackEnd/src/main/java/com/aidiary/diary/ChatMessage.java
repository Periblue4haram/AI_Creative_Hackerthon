package com.aidiary.diary;

import com.aidiary.common.Times;
import com.aidiary.diary.DiaryEnums.MessageRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "page_id")
    public Long pageId;

    @Enumerated(EnumType.STRING)
    public MessageRole role;

    public String content;

    @Column(name = "created_at", updatable = false)
    public LocalDateTime createdAt = Times.now();

    protected ChatMessage() {}

    public ChatMessage(Long pageId, MessageRole role, String content) {
        this.pageId = pageId;
        this.role = role;
        this.content = content;
    }
}

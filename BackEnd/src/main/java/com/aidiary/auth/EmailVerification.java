package com.aidiary.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "email_verifications")
public class EmailVerification {

    @Id
    @Column(name = "user_id")
    public Long userId;

    @Column(name = "code_hash")
    public String codeHash;

    @Column(name = "expires_at")
    public LocalDateTime expiresAt;

    public int attempts;

    @Column(name = "last_sent_at")
    public LocalDateTime lastSentAt;

    protected EmailVerification() {}

    public EmailVerification(Long userId) {
        this.userId = userId;
    }
}

package com.aidiary.user;

import com.aidiary.common.Times;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public String email;

    @Column(name = "email_verified_at")
    public LocalDateTime emailVerifiedAt;

    @Column(name = "password_hash")
    public String passwordHash;

    @Column(name = "google_sub")
    public String googleSub;

    public String nickname;

    @Column(name = "created_at", updatable = false)
    public LocalDateTime createdAt = Times.now();

    protected User() {}

    public User(String email, String nickname) {
        this.email = email;
        this.nickname = nickname;
    }

    public boolean isVerified() {
        return emailVerifiedAt != null;
    }
}

package com.aidiary.auth;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from EmailVerification v where v.userId = :userId")
    Optional<EmailVerification> lockByUserId(@Param("userId") Long userId);
}

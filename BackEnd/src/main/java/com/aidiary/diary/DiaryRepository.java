package com.aidiary.diary;

import com.aidiary.diary.DiaryEnums.DiaryStatus;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DiaryRepository extends JpaRepository<Diary, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Diary d where d.id = :id")
    Optional<Diary> lockById(@Param("id") Long id);

    Page<Diary> findByUserIdAndStatus(Long userId, DiaryStatus status, Pageable pageable);
}

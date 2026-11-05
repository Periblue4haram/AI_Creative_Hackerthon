package com.aidiary.diary;

import com.aidiary.diary.DiaryEnums.DiaryStatus;
import com.aidiary.diary.DiaryEnums.ImageStatus;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DiaryPageRepository extends JpaRepository<DiaryPage, Long> {

    List<DiaryPage> findByDiaryIdOrderBySortOrderAscIdAsc(Long diaryId);

    List<DiaryPage> findByDiaryIdInOrderBySortOrderAscIdAsc(Collection<Long> diaryIds);

    long countByDiaryId(Long diaryId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from DiaryPage p where p.id = :id")
    Optional<DiaryPage> lockById(@Param("id") Long id);

    /** 서버가 재시작되어 멈춘 변환 작업을 대기 상태로 되돌린다. */
    @Modifying
    @Query("update DiaryPage p set p.imageStatus = :to where p.imageStatus = :from")
    int updateImageStatus(@Param("from") ImageStatus from, @Param("to") ImageStatus to);

    @Query("""
            select p.id from DiaryPage p, Diary d
            where p.diaryId = d.id and d.status = :status and p.imageStatus = :imageStatus
              and p.logicalDate = d.logicalDate and p.locationSource is not null
            """)
    List<Long> findReadyToConvert(@Param("status") DiaryStatus status, @Param("imageStatus") ImageStatus imageStatus);
}

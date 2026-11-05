package com.aidiary.diary;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByPageIdOrderByIdAsc(Long pageId);

    boolean existsByPageId(Long pageId);

    @Modifying
    @Query("delete from ChatMessage m where m.pageId = :pageId")
    void deleteByPageId(@Param("pageId") Long pageId);
}

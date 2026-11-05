package com.aidiary.image;

import com.aidiary.image.PageImage.Kind;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PageImageRepository extends JpaRepository<PageImage, Long> {

    Optional<PageImage> findByPageIdAndKind(Long pageId, Kind kind);

    List<PageImage> findByPageId(Long pageId);

    List<PageImage> findByPageIdIn(Collection<Long> pageIds);
}

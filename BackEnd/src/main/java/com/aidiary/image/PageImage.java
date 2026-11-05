package com.aidiary.image;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "page_images")
public class PageImage {

    public enum Kind {
        ORIGINAL,
        CONVERTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "page_id")
    public Long pageId;

    @Enumerated(EnumType.STRING)
    public Kind kind;

    @Column(name = "content_type")
    public String contentType;

    @Column(name = "byte_size")
    public int byteSize;

    @Column(name = "storage_path")
    public String storagePath;

    protected PageImage() {}

    public PageImage(Long pageId, Kind kind, String contentType, int byteSize, String storagePath) {
        this.pageId = pageId;
        this.kind = kind;
        this.contentType = contentType;
        this.byteSize = byteSize;
        this.storagePath = storagePath;
    }
}

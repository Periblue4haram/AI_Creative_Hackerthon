package com.aidiary.image;

import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import java.io.UncheckedIOException;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ImageController {

    private final PageImageRepository images;
    private final ImageStorage storage;
    private final ImageUrls urls;

    public ImageController(PageImageRepository images, ImageStorage storage, ImageUrls urls) {
        this.images = images;
        this.storage = storage;
        this.urls = urls;
    }

    @GetMapping("/api/v1/images/{id}")
    public ResponseEntity<byte[]> image(@PathVariable long id, @RequestParam long exp, @RequestParam String sig) {
        if (!urls.isValid(id, exp, sig)) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        PageImage image = images.findById(id).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        byte[] bytes;
        try {
            bytes = storage.read(image.storagePath);
        } catch (UncheckedIOException e) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType))
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePrivate())
                .body(bytes);
    }
}

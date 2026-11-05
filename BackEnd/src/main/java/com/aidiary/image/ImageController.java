package com.aidiary.image;

import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import com.aidiary.image.ImageUrls.UserImage;
import com.aidiary.user.User;
import com.aidiary.user.UserRepository;
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
    private final UserRepository users;
    private final ImageStorage storage;
    private final ImageUrls urls;

    public ImageController(PageImageRepository images, UserRepository users, ImageStorage storage, ImageUrls urls) {
        this.images = images;
        this.users = users;
        this.storage = storage;
        this.urls = urls;
    }

    @GetMapping("/api/v1/images/{id}")
    public ResponseEntity<byte[]> image(@PathVariable long id, @RequestParam long exp, @RequestParam String sig) {
        if (!urls.isValid(id, exp, sig)) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        PageImage image = images.findById(id).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        return respond(image.storagePath, image.contentType);
    }

    /** 프로필 사진(profile)과 얼굴 데이터(face). 모두 JPEG로 저장한다. */
    @GetMapping("/api/v1/images/users/{userId}/{kind}")
    public ResponseEntity<byte[]> userImage(
            @PathVariable long userId,
            @PathVariable String kind,
            @RequestParam int v,
            @RequestParam long exp,
            @RequestParam String sig) {
        UserImage type = switch (kind) {
            case "profile" -> UserImage.PROFILE;
            case "face" -> UserImage.FACE;
            default -> throw new ApiException(ErrorCode.NOT_FOUND);
        };
        if (!urls.isValidUserImage(type, userId, v, exp, sig)) {
            throw new ApiException(ErrorCode.UNAUTHORIZED);
        }
        User user = users.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        String path = type == UserImage.PROFILE ? user.profileImagePath : user.faceImagePath;
        if (path == null) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        return respond(path, MediaType.IMAGE_JPEG_VALUE);
    }

    private ResponseEntity<byte[]> respond(String path, String contentType) {
        byte[] bytes;
        try {
            bytes = storage.read(path);
        } catch (UncheckedIOException e) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePrivate())
                .body(bytes);
    }
}

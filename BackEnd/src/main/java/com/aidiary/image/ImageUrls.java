package com.aidiary.image;

import com.aidiary.common.Hashes;
import com.aidiary.config.AppProperties;
import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/** img 태그에서 쓸 수 있도록 HMAC으로 서명한 이미지 URL을 만들고 검증한다. */
@Component
public class ImageUrls {

    /** 사용자 단위 이미지 종류. 얼굴 데이터 URL은 본인에게만 내려준다. */
    public enum UserImage {
        PROFILE,
        FACE
    }

    private static final Duration TTL = Duration.ofHours(1);

    private final String secret;

    public ImageUrls(AppProperties props) {
        this.secret = props.imageUrlSigningSecret();
    }

    public String signedUrl(long imageId) {
        long expires = expiresAt();
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/images/{id}")
                .queryParam("exp", expires)
                .queryParam("sig", signature(imageId + ":" + expires))
                .buildAndExpand(imageId)
                .toUriString();
    }

    /** version을 넣어 사진을 바꾸면 URL이 달라지게 한다(브라우저 캐시 구분). */
    public String signedUserImageUrl(UserImage kind, long userId, int version) {
        long expires = expiresAt();
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/images/users/{userId}/{kind}")
                .queryParam("v", version)
                .queryParam("exp", expires)
                .queryParam("sig", signature(userPayload(kind, userId, version, expires)))
                .buildAndExpand(userId, kind.name().toLowerCase())
                .toUriString();
    }

    public boolean isValid(long imageId, long expires, String signature) {
        return notExpired(expires) && Hashes.constantTimeEquals(signature(imageId + ":" + expires), signature);
    }

    public boolean isValidUserImage(UserImage kind, long userId, int version, long expires, String signature) {
        return notExpired(expires)
                && Hashes.constantTimeEquals(signature(userPayload(kind, userId, version, expires)), signature);
    }

    private static String userPayload(UserImage kind, long userId, int version, long expires) {
        return "user:" + kind.name() + ":" + userId + ":" + version + ":" + expires;
    }

    private static long expiresAt() {
        return Instant.now().plus(TTL).getEpochSecond();
    }

    private static boolean notExpired(long expires) {
        return expires > Instant.now().getEpochSecond();
    }

    private String signature(String payload) {
        return Hashes.hmacHex(secret, payload);
    }
}

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

    private static final Duration TTL = Duration.ofHours(1);

    private final String secret;

    public ImageUrls(AppProperties props) {
        this.secret = props.imageUrlSigningSecret();
    }

    public String signedUrl(long imageId) {
        long expires = Instant.now().plus(TTL).getEpochSecond();
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/images/{id}")
                .queryParam("exp", expires)
                .queryParam("sig", signature(imageId, expires))
                .buildAndExpand(imageId)
                .toUriString();
    }

    public boolean isValid(long imageId, long expires, String signature) {
        return expires > Instant.now().getEpochSecond()
                && Hashes.constantTimeEquals(signature(imageId, expires), signature);
    }

    private String signature(long imageId, long expires) {
        return Hashes.hmacHex(secret, imageId + ":" + expires);
    }
}

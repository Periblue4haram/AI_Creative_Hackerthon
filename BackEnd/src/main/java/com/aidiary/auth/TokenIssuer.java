package com.aidiary.auth;

import com.aidiary.auth.AuthDtos.AuthTokens;
import com.aidiary.auth.AuthDtos.AuthUser;
import com.aidiary.common.Hashes;
import com.aidiary.common.Times;
import com.aidiary.user.User;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

@Component
public class TokenIssuer {

    private static final Duration ACCESS_TTL = Duration.ofMinutes(30);
    private static final Duration REFRESH_TTL = Duration.ofDays(14);

    private final JwtEncoder encoder;
    private final RefreshTokenRepository refreshTokens;
    private final SecureRandom random = new SecureRandom();

    public TokenIssuer(JwtEncoder encoder, RefreshTokenRepository refreshTokens) {
        this.encoder = encoder;
        this.refreshTokens = refreshTokens;
    }

    /** 호출하는 쪽의 트랜잭션 안에서 리프레시 토큰을 저장한다. */
    public AuthTokens issue(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(String.valueOf(user.id))
                .issuedAt(now)
                .expiresAt(now.plus(ACCESS_TTL))
                .build();
        String access = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String refresh = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokens.save(new RefreshToken(user.id, Hashes.sha256Hex(refresh), Times.now().plus(REFRESH_TTL)));

        return new AuthTokens(
                access,
                refresh,
                ACCESS_TTL.toSeconds(),
                new AuthUser(user.id, user.email, user.nickname));
    }
}

package com.aidiary.auth;

import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import com.aidiary.config.AppProperties;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

@Component
public class GoogleTokenVerifier {

    public record GoogleUser(String sub, String email) {}

    private static final String JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final String ISSUER = "https://accounts.google.com";

    private final AppProperties props;
    private volatile NimbusJwtDecoder decoder;

    public GoogleTokenVerifier(AppProperties props) {
        this.props = props;
    }

    public GoogleUser verify(String idToken) {
        if (props.googleClientId() == null || props.googleClientId().isBlank()) {
            throw new ApiException(ErrorCode.INVALID_GOOGLE_TOKEN);
        }
        Jwt jwt;
        try {
            jwt = decoder().decode(idToken);
        } catch (JwtException e) {
            throw new ApiException(ErrorCode.INVALID_GOOGLE_TOKEN);
        }
        String email = jwt.getClaimAsString("email");
        if (email == null || !Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))) {
            throw new ApiException(ErrorCode.INVALID_GOOGLE_TOKEN);
        }
        return new GoogleUser(jwt.getSubject(), email.strip().toLowerCase());
    }

    private NimbusJwtDecoder decoder() {
        if (decoder == null) {
            NimbusJwtDecoder built = NimbusJwtDecoder.withJwkSetUri(JWKS_URI).build();
            built.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                    JwtValidators.createDefaultWithIssuer(ISSUER), jwt -> jwt.getAudience().contains(props.googleClientId())
                            ? OAuth2TokenValidatorResult.success()
                            : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_audience"))));
            decoder = built;
        }
        return decoder;
    }
}

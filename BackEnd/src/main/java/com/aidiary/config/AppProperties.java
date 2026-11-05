package com.aidiary.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app")
public record AppProperties(
        List<String> corsAllowedOrigins,
        String jwtSecret,
        String imageUrlSigningSecret,
        String emailCodeHmacSecret,
        String imageStorageRoot,
        String googleClientId,
        String mailFrom,
        double searchMinSimilarity,
        Gemini gemini,
        Cloudflare cloudflare,
        Naver naver) {

    public record Gemini(String apiKey, String chatModel, String embeddingModel, int embeddingDimensions) {}

    public record Cloudflare(String accountId, String apiToken, String imageModel) {}

    public record Naver(String clientId, String clientSecret) {}
}

package com.aidiary.geo;

import com.aidiary.config.AppProperties;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

@Component
public class NaverGeoLocator implements GeoLocator {

    private static final Logger log = LoggerFactory.getLogger(NaverGeoLocator.class);
    private static final int STATUS_OK = 0;
    private static final int STATUS_NO_RESULT = 3;

    private final RestClient client;

    public NaverGeoLocator(AppProperties props) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.client = RestClient.builder()
                .requestFactory(factory)
                .baseUrl("https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc")
                .defaultHeader("x-ncp-apigw-api-key-id", props.naver().clientId())
                .defaultHeader("x-ncp-apigw-api-key", props.naver().clientSecret())
                .build();
    }

    @Override
    public GeoResult locate(double latitude, double longitude) {
        try {
            String coords = String.format(Locale.ROOT, "%.7f,%.7f", longitude, latitude);
            JsonNode body = client.get()
                    .uri(u -> u.queryParam("coords", coords)
                            .queryParam("output", "json")
                            .queryParam("orders", "legalcode")
                            .build())
                    .retrieve()
                    .body(JsonNode.class);
            return parse(body);
        } catch (RestClientException | IllegalArgumentException e) {
            // GPS 좌표는 로그에 남기지 않는다
            log.warn("네이버 위치 판정 실패: {}", e.getClass().getSimpleName());
            return GeoResult.unavailable();
        }
    }

    private static GeoResult parse(JsonNode body) {
        int code = body.path("status").path("code").asInt(-1);
        if (code == STATUS_NO_RESULT) {
            return GeoResult.outside();
        }
        JsonNode results = body.path("results");
        if (code != STATUS_OK || results.isEmpty()) {
            return GeoResult.unavailable();
        }
        JsonNode region = results.get(0).path("region");
        return Region.fromAddress(region.path("area1").path("name").asString(""), region.path("area2").path("name").asString(""))
                .map(GeoResult::supported)
                .orElseGet(GeoResult::outside);
    }
}

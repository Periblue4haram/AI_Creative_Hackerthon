package com.aidiary.ai;

import com.aidiary.config.AppProperties;
import com.aidiary.image.ImageCodec;
import java.awt.image.BufferedImage;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Base64;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Cloudflare Workers AI의 FLUX.2 [klein] 4B로 그림체를 바꾼다.
 * 결과는 항상 입력 사진과 같은 가로세로 크기의 JPEG로 돌려준다.
 */
@Component
public class CloudflareImageStyler implements ImageStyler {

    /** 입력 이미지는 512x512보다 작아야 한다. */
    static final int MAX_INPUT_EDGE = 511;
    /** 출력 크기는 가로, 세로 각각 256~1920px만 지정할 수 있다. */
    static final int MIN_OUTPUT_EDGE = 256;
    static final int MAX_OUTPUT_EDGE = 1920;
    /** 문서에 명시되지 않았지만 FLUX 계열은 16의 배수 크기를 쓰므로 맞춰 요청하고 결과를 원본 크기로 되돌린다. */
    private static final int SIZE_STEP = 16;

    private static final String PROMPT = """
            Redraw image 0 as a hand-drawn Japanese anime illustration.
            Keep the same composition, number of people, poses, objects and place.
            Use soft clean line art and warm colors. Do not add any text, logo or watermark.""";

    private static final String FACE_SENTENCE =
            " Draw the main person in image 0 so that they resemble the person in image 1. Use image 1 only for that face.";

    record Size(int width, int height) {}

    private final RestClient client;
    private final JsonMapper json;
    private final URI endpoint;
    private final String token;

    public CloudflareImageStyler(AppProperties props, JsonMapper json) {
        AppProperties.Cloudflare config = props.cloudflare();
        this.json = json;
        this.token = config.apiToken();
        this.endpoint = URI.create("https://api.cloudflare.com/client/v4/accounts/" + config.accountId() + "/ai/run/" + config.imageModel());
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10))
                .build());
        factory.setReadTimeout(Duration.ofSeconds(120));
        this.client = RestClient.builder().requestFactory(factory).build();
    }

    @Override
    public GeneratedImage toAnimeStyle(byte[] jpegPhoto, byte[] faceReference) {
        if (token == null || token.isBlank()) {
            throw new AiUnavailableException("CLOUDFLARE_API_TOKEN이 설정되지 않았습니다");
        }
        BufferedImage original = ImageCodec.decode(jpegPhoto);
        if (original == null) {
            throw new AiUnavailableException("변환할 사진을 읽지 못했습니다");
        }
        Size request = requestSize(original.getWidth(), original.getHeight());
        byte[] input = ImageCodec.encodeJpeg(ImageCodec.fitWithin(original, MAX_INPUT_EDGE));
        byte[] face = null;
        if (faceReference != null) {
            BufferedImage decoded = ImageCodec.decode(faceReference);
            face = decoded == null ? null : ImageCodec.encodeJpeg(ImageCodec.fitWithin(decoded, MAX_INPUT_EDGE));
        }

        byte[] generated = call(input, face, request);
        BufferedImage result = ImageCodec.decode(generated);
        if (result == null) {
            throw new AiUnavailableException("Cloudflare 응답 이미지를 읽지 못했습니다");
        }
        BufferedImage sameSize = ImageCodec.resize(result, original.getWidth(), original.getHeight());
        return new GeneratedImage(ImageCodec.encodeJpeg(sameSize), MediaType.IMAGE_JPEG_VALUE);
    }

    /** 원본 비율을 유지하면서 모델이 받는 범위(256~1920px, 16의 배수)에 맞춘 요청 크기. */
    static Size requestSize(int width, int height) {
        double scale = 1.0;
        int longEdge = Math.max(width, height);
        int shortEdge = Math.min(width, height);
        if (longEdge > MAX_OUTPUT_EDGE) {
            scale = (double) MAX_OUTPUT_EDGE / longEdge;
        } else if (shortEdge < MIN_OUTPUT_EDGE) {
            scale = Math.min((double) MIN_OUTPUT_EDGE / shortEdge, (double) MAX_OUTPUT_EDGE / longEdge);
        }
        return new Size(fit(width * scale), fit(height * scale));
    }

    private static int fit(double edge) {
        int rounded = (int) Math.round(edge / SIZE_STEP) * SIZE_STEP;
        return Math.max(MIN_OUTPUT_EDGE, Math.min(MAX_OUTPUT_EDGE, rounded));
    }

    private byte[] call(byte[] input, byte[] face, Size size) {
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("prompt", face == null ? PROMPT : PROMPT + FACE_SENTENCE);
        form.add("input_image_0", imagePart("input_image_0", input));
        if (face != null) {
            form.add("input_image_1", imagePart("input_image_1", face));
        }
        form.add("width", String.valueOf(size.width()));
        form.add("height", String.valueOf(size.height()));

        try {
            ResponseEntity<byte[]> response = client.post()
                    .uri(endpoint)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(form)
                    .retrieve()
                    .toEntity(byte[].class);
            return extractImage(response);
        } catch (RestClientResponseException e) {
            throw new AiUnavailableException(
                    "Cloudflare 호출 실패: HTTP " + e.getStatusCode().value() + " " + errorMessage(e.getResponseBodyAsString()), e);
        } catch (RestClientException e) {
            throw new AiUnavailableException("Cloudflare 호출 실패", e);
        }
    }

    private static HttpEntity<ByteArrayResource> imagePart(String name, byte[] bytes) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_JPEG);
        headers.setContentDispositionFormData(name, name + ".jpg");
        ByteArrayResource resource = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return name + ".jpg";
            }
        };
        return new HttpEntity<>(resource, headers);
    }

    /** 응답은 {"result":{"image":"base64"}} 형태지만, 이미지 바이트를 바로 주는 경우도 처리한다. */
    private byte[] extractImage(ResponseEntity<byte[]> response) {
        byte[] body = response.getBody();
        if (body == null || body.length == 0) {
            throw new AiUnavailableException("Cloudflare 응답이 비어 있습니다");
        }
        MediaType type = response.getHeaders().getContentType();
        if (type != null && "image".equals(type.getType())) {
            return body;
        }
        try {
            JsonNode root = json.readTree(body);
            String b64 = root.path("result").path("image").asString(root.path("image").asString(""));
            if (b64.isBlank()) {
                throw new AiUnavailableException("Cloudflare 응답에 이미지가 없습니다: " + errorMessage(new String(body)));
            }
            return Base64.getDecoder().decode(b64);
        } catch (JacksonException | IllegalArgumentException e) {
            throw new AiUnavailableException("Cloudflare 응답 형식 오류", e);
        }
    }

    private String errorMessage(String body) {
        try {
            JsonNode errors = json.readTree(body).path("errors");
            return errors.isEmpty() ? "" : errors.get(0).path("message").asString("");
        } catch (JacksonException e) {
            return "";
        }
    }
}

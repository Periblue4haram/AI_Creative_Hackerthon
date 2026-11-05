package com.aidiary.ai;

import com.aidiary.config.AppProperties;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Component
public class GeminiGateway implements AiGateway {

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final int MAX_OVERLOAD_ATTEMPTS = 3;
    private static final long OVERLOAD_BACKOFF_MS = 2000;

    private static final String CHAT_SYSTEM = """
            당신은 사용자가 사진 한 장으로 짧은 일기를 쓰도록 돕는 다정한 인터뷰어입니다.
            이 대화는 사진 한 장에 대한 일기 한 페이지만 다룹니다.
            규칙:
            - 한국어 존댓말로 질문을 한 번에 하나만 합니다.
            - 질문은 한 문장 또는 두 문장으로 짧게 합니다.
            - 이 사진의 장소에 대한 소감과 정보만 묻고, 사진과 무관한 주제로 넘어가지 않습니다.
            - 사용자의 답변에 맞춰 질문을 유연하게 바꿉니다.
            - 사용자가 말하지 않은 사실을 단정하지 않습니다.""";

    private static final String FIRST_QUESTION_PROMPT =
            "이 사진을 분석해 사용자가 어떤 행동을 했는지 유추하고, 그 유추를 확인하는 첫 질문을 해 주세요.";

    private static final String NEXT_QUESTION_INSTRUCTION = """
            사용자의 답변을 바탕으로 다음 질문을 작성하세요.
            estimatedChars에는 지금까지의 답변만으로 일기를 쓴다면 자연스럽게 나올 글자 수를 정수로 적으세요.
            답변 내용이 적으면 작은 값을 적고, 내용을 부풀리지 마세요.""";

    private static final String DIARY_SYSTEM = """
            당신은 사용자의 대화를 바탕으로 사진 한 장에 대한 일기 한 페이지를 대신 써 주는 작가입니다.
            규칙:
            - 한국어 일기체로, 사용자가 직접 쓴 것처럼 1인칭으로 씁니다.
            - 공백 포함 500자 안팎으로 쓰고 절대 800자를 넘기지 않습니다.
            - 대화에 없는 사실은 지어내지 않습니다. 사진에서 분명히 보이는 내용만 덧붙입니다.
            - 이 페이지만 읽어도 이해되도록 씁니다.
            - 날짜 제목, 마크다운 기호, 굵은 글씨 없이 일기 본문만 출력합니다.""";

    private static final String DIARY_PROMPT = "지금까지의 대화를 바탕으로 이 사진의 일기 한 페이지를 작성해 주세요.";

    private static final Map<String, Object> QUESTION_SCHEMA = Map.of(
            "type", "OBJECT",
            "properties", Map.of("question", Map.of("type", "STRING"), "estimatedChars", Map.of("type", "INTEGER")),
            "required", List.of("question", "estimatedChars"));

    private final AppProperties.Gemini config;
    private final RestClient client;
    private final JsonMapper json;

    public GeminiGateway(AppProperties props, JsonMapper json) {
        this.config = props.gemini();
        this.json = json;
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder()
                        .version(HttpClient.Version.HTTP_1_1)
                        .connectTimeout(Duration.ofSeconds(10))
                        .build());
        factory.setReadTimeout(Duration.ofSeconds(120));
        this.client = RestClient.builder()
                .requestFactory(factory)
                .defaultHeader("x-goog-api-key", config.apiKey())
                .build();
    }

    @Override
    public String firstQuestion(byte[] photo, String context) {
        List<Map<String, Object>> contents =
                List.of(userWithPhoto(photo, context + "\n\n" + FIRST_QUESTION_PROMPT));
        return generateText(config.chatModel(), CHAT_SYSTEM, contents, null);
    }

    @Override
    public ChatReply nextQuestion(byte[] photo, String context, List<Turn> history) {
        Map<String, Object> generationConfig =
                Map.of("responseMimeType", "application/json", "responseSchema", QUESTION_SCHEMA);
        String text = generateText(
                config.chatModel(),
                CHAT_SYSTEM + "\n" + NEXT_QUESTION_INSTRUCTION,
                conversation(photo, context, history, null),
                generationConfig);
        try {
            JsonNode reply = json.readTree(text);
            String question = reply.path("question").asString("");
            if (question.isBlank()) {
                throw new AiUnavailableException("질문이 비어 있습니다");
            }
            return new ChatReply(question, Math.max(0, reply.path("estimatedChars").asInt(0)));
        } catch (JacksonException e) {
            throw new AiUnavailableException("질문 응답 형식 오류", e);
        }
    }

    @Override
    public String writeDiary(byte[] photo, String context, List<Turn> history) {
        return generateText(config.chatModel(), DIARY_SYSTEM, conversation(photo, context, history, DIARY_PROMPT), null);
    }

    @Override
    public float[] embedDocument(String text) {
        return embed(text, "RETRIEVAL_DOCUMENT");
    }

    @Override
    public float[] embedQuery(String text) {
        return embed(text, "RETRIEVAL_QUERY");
    }

    private float[] embed(String text, String taskType) {
        Map<String, Object> body = Map.of(
                "content", Map.of("parts", List.of(Map.of("text", text))),
                "taskType", taskType,
                "outputDimensionality", config.embeddingDimensions());
        JsonNode values = post(config.embeddingModel() + ":embedContent", body).path("embedding").path("values");
        if (values.isEmpty()) {
            throw new AiUnavailableException("임베딩이 응답에 없습니다");
        }
        float[] vector = new float[values.size()];
        for (int i = 0; i < vector.length; i++) {
            vector[i] = values.get(i).floatValue();
        }
        return vector;
    }

    private List<Map<String, Object>> conversation(byte[] photo, String context, List<Turn> history, String lastPrompt) {
        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(userWithPhoto(photo, context + "\n\n" + FIRST_QUESTION_PROMPT));
        for (Turn turn : history) {
            contents.add(Map.of("role", turn.fromUser() ? "user" : "model", "parts", List.of(Map.of("text", turn.content()))));
        }
        if (lastPrompt != null) {
            contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", lastPrompt))));
        }
        return contents;
    }

    private static Map<String, Object> userWithPhoto(byte[] photo, String text) {
        Map<String, Object> image =
                Map.of("inlineData", Map.of("mimeType", MediaType.IMAGE_JPEG_VALUE, "data", Base64.getEncoder().encodeToString(photo)));
        return Map.of("role", "user", "parts", List.of(image, Map.of("text", text)));
    }

    private String generateText(
            String model, String system, List<Map<String, Object>> contents, Map<String, Object> generationConfig) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", system))));
        body.put("contents", contents);
        if (generationConfig != null) {
            body.put("generationConfig", generationConfig);
        }
        StringBuilder text = new StringBuilder();
        for (JsonNode part : firstCandidateParts(post(model + ":generateContent", body))) {
            text.append(part.path("text").asString(""));
        }
        if (text.isEmpty()) {
            throw new AiUnavailableException("글이 응답에 없습니다");
        }
        return text.toString().strip();
    }

    private static JsonNode firstCandidateParts(JsonNode response) {
        JsonNode parts = response.path("candidates").path(0).path("content").path("parts");
        if (parts.isEmpty()) {
            throw new AiUnavailableException("Gemini 응답에 내용이 없습니다");
        }
        return parts;
    }

    /** 503은 일시적인 과부하이므로 잠시 기다렸다가 다시 호출한다. */
    private JsonNode post(String path, Map<String, Object> body) {
        for (int attempt = 1; ; attempt++) {
            try {
                return client.post()
                        .uri(java.net.URI.create(BASE_URL + path))
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(JsonNode.class);
            } catch (RestClientResponseException e) {
                if (e.getStatusCode().value() != 503 || attempt >= MAX_OVERLOAD_ATTEMPTS) {
                    throw new AiUnavailableException("Gemini 호출 실패: HTTP " + e.getStatusCode().value(), e);
                }
                sleep(attempt * OVERLOAD_BACKOFF_MS);
            } catch (RestClientException e) {
                throw new AiUnavailableException("Gemini 호출 실패", e);
            }
        }
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AiUnavailableException("Gemini 호출 중단", e);
        }
    }
}

package com.aidiary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aidiary.ai.AiGateway;
import com.aidiary.ai.AiGateway.ChatReply;
import com.aidiary.ai.AiUnavailableException;
import com.aidiary.ai.ImageStyler;
import com.aidiary.ai.ImageStyler.GeneratedImage;
import com.aidiary.auth.GoogleTokenVerifier;
import com.aidiary.auth.GoogleTokenVerifier.GoogleUser;
import com.aidiary.auth.VerificationMailSender;
import com.aidiary.community.EmbeddingJob;
import com.aidiary.geo.GeoLocator;
import com.aidiary.geo.GeoLocator.GeoResult;
import com.aidiary.geo.Region;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** 실제 MySQL(ai_diary_test)에 대해 HTTP 계층부터 검증한다. 외부 서비스만 대체한다. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(ApiFlowTest.SyncConversion.class)
class ApiFlowTest {

    private static final String DATE = "2026-11-06";

    @TestConfiguration
    static class SyncConversion {
        @Bean
        @Primary
        TaskExecutor syncExecutor() {
            return new SyncTaskExecutor();
        }
    }

    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @Autowired JdbcClient jdbc;
    @Autowired EmbeddingJob embeddingJob;

    @MockitoBean AiGateway ai;
    @MockitoBean ImageStyler styler;
    @MockitoBean GeoLocator geo;
    @MockitoBean VerificationMailSender mail;
    @MockitoBean GoogleTokenVerifier google;

    private int userCounter;

    @BeforeEach
    void setUp() {
        jdbc.sql("DELETE FROM users").update();
        reset(ai, styler, geo, mail, google);
        when(styler.toAnimeStyle(any())).thenReturn(new GeneratedImage(new byte[] {1, 2, 3}, "image/png"));
        when(ai.firstQuestion(any(), anyString())).thenReturn("첫 질문");
        when(ai.nextQuestion(any(), anyString(), any())).thenReturn(new ChatReply("다음 질문", 100));
        when(ai.writeDiary(any(), anyString(), any())).thenReturn("오늘의 일기");
    }

    // ---------- 인증 ----------

    @Test
    void signupRequiresEmailVerificationBeforeLogin() throws Exception {
        send(post("/api/v1/auth/signup"), null, Map.of("email", "a@example.com", "password", "password123", "nickname", "철수"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.verificationRequired").value(true))
                .andExpect(jsonPath("$.accessToken").doesNotExist());

        send(post("/api/v1/auth/login"), null, Map.of("email", "a@example.com", "password", "password123"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("EMAIL_NOT_VERIFIED"));
        send(post("/api/v1/auth/login"), null, Map.of("email", "a@example.com", "password", "wrong-password"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));

        String code = sentCode("a@example.com");
        send(post("/api/v1/auth/email/verify"), null, Map.of("email", "a@example.com", "code", code))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.user.nickname").value("철수"));

        send(post("/api/v1/auth/login"), null, Map.of("email", "a@example.com", "password", "password123"))
                .andExpect(status().isOk());
    }

    @Test
    void verificationCodeBlockedAfterFiveFailures() throws Exception {
        send(post("/api/v1/auth/signup"), null, Map.of("email", "b@example.com", "password", "password123", "nickname", "영희"));
        String code = sentCode("b@example.com");
        String wrong = code.equals("000000") ? "111111" : "000000";

        for (int i = 0; i < 5; i++) {
            send(post("/api/v1/auth/email/verify"), null, Map.of("email", "b@example.com", "code", wrong))
                    .andExpect(jsonPath("$.code").value("INVALID_VERIFICATION_CODE"));
        }
        send(post("/api/v1/auth/email/verify"), null, Map.of("email", "b@example.com", "code", code))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resendIsLimitedAndHidesUnknownEmails() throws Exception {
        send(post("/api/v1/auth/signup"), null, Map.of("email", "c@example.com", "password", "password123", "nickname", "민수"));

        send(post("/api/v1/auth/email/resend"), null, Map.of("email", "c@example.com"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.details.retryAfterSeconds").exists());
        send(post("/api/v1/auth/email/resend"), null, Map.of("email", "nobody@example.com"))
                .andExpect(status().isNoContent());
    }

    @Test
    void verifiedEmailCannotSignUpAgainButUnverifiedIsOverwritten() throws Exception {
        String token = newUser();
        String email = read(send(get("/api/v1/me"), token, null)).path("email").asString();
        send(post("/api/v1/auth/signup"), null, Map.of("email", email, "password", "password123", "nickname", "다른이름"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));

        // 다른 사람이 먼저 가입한 미인증 계정은 60초 뒤 실제 메일 주인이 덮어쓸 수 있다
        send(post("/api/v1/auth/signup"), null, Map.of("email", "f@example.com", "password", "attacker-pass", "nickname", "선점자"));
        send(post("/api/v1/auth/signup"), null, Map.of("email", "f@example.com", "password", "owner-password", "nickname", "주인"))
                .andExpect(status().isTooManyRequests());
        jdbc.sql("UPDATE email_verifications SET last_sent_at = last_sent_at - INTERVAL 2 MINUTE").update();
        send(post("/api/v1/auth/signup"), null, Map.of("email", "f@example.com", "password", "owner-password", "nickname", "주인"))
                .andExpect(status().isCreated());

        send(post("/api/v1/auth/email/verify"), null, Map.of("email", "f@example.com", "code", sentCode("f@example.com")))
                .andExpect(jsonPath("$.user.nickname").value("주인"));
        send(post("/api/v1/auth/login"), null, Map.of("email", "f@example.com", "password", "attacker-pass"))
                .andExpect(status().isUnauthorized());
        send(post("/api/v1/auth/login"), null, Map.of("email", "f@example.com", "password", "owner-password"))
                .andExpect(status().isOk());
    }

    @Test
    void refreshRotatesTokenAndLogoutRevokes() throws Exception {
        send(post("/api/v1/auth/signup"), null, Map.of("email", "d@example.com", "password", "password123", "nickname", "지수"));
        JsonNode tokens = read(send(post("/api/v1/auth/email/verify"), null, Map.of("email", "d@example.com", "code", sentCode("d@example.com"))));
        String first = tokens.path("refreshToken").asString();

        JsonNode second = read(send(post("/api/v1/auth/refresh"), null, Map.of("refreshToken", first)));
        send(post("/api/v1/auth/refresh"), null, Map.of("refreshToken", first))
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));

        String latest = second.path("refreshToken").asString();
        send(post("/api/v1/auth/logout"), null, Map.of("refreshToken", latest)).andExpect(status().isNoContent());
        send(post("/api/v1/auth/refresh"), null, Map.of("refreshToken", latest)).andExpect(status().isUnauthorized());
    }

    @Test
    void googleLoginLinksAccountAndDropsUnverifiedPassword() throws Exception {
        send(post("/api/v1/auth/signup"), null, Map.of("email", "e@example.com", "password", "password123", "nickname", "수상한사람"));
        when(google.verify("id-token")).thenReturn(new GoogleUser("sub-1", "e@example.com"));

        send(post("/api/v1/auth/google"), null, Map.of("idToken", "id-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists());
        send(post("/api/v1/auth/login"), null, Map.of("email", "e@example.com", "password", "password123"))
                .andExpect(status().isUnauthorized());

        when(google.verify("new-token")).thenReturn(new GoogleUser("sub-2", "new@example.com"));
        send(post("/api/v1/auth/google"), null, Map.of("idToken", "new-token")).andExpect(status().isCreated());
    }

    @Test
    void apiRequiresToken() throws Exception {
        mvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    // ---------- 업로드와 메타데이터 ----------

    @Test
    void exifGivesDateAndRegionAndDayStartsAtFiveAm() throws Exception {
        String token = newUser();
        when(geo.locate(anyDouble(), anyDouble())).thenReturn(GeoResult.supported(Region.MAPO));

        byte[] photo = TestPhotos.exifJpeg(40, 30, "2026:11:07 03:00:00", 37.55, 126.92, 1);
        upload(token, List.of(photo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("METADATA_PENDING"))
                .andExpect(jsonPath("$.pages[0].logicalDate").value("2026-11-06"))
                .andExpect(jsonPath("$.pages[0].dateSource").value("EXIF"))
                .andExpect(jsonPath("$.pages[0].region").value("MAPO"))
                .andExpect(jsonPath("$.pages[0].locationSource").value("EXIF"))
                .andExpect(jsonPath("$.pages[0].metadataIssues").isEmpty());
    }

    @Test
    void uploadRejectsPhotosOutsideFourDistricts() throws Exception {
        String token = newUser();
        when(geo.locate(anyDouble(), anyDouble())).thenReturn(GeoResult.outside());

        byte[] outside = TestPhotos.exifJpeg(40, 30, "2026:11:06 12:00:00", 35.1, 129.0, 1);
        upload(token, List.of(TestPhotos.plainJpeg(), outside))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("REGION_NOT_SUPPORTED"))
                .andExpect(jsonPath("$.message").value("5개의 구 외에는 아직 불가능합니다"))
                .andExpect(jsonPath("$.details.fileIndexes[0]").value(1));
        assertThat(jdbc.sql("SELECT COUNT(*) FROM diaries").query(Long.class).single()).isZero();
    }

    @Test
    void geocodingFailureFallsBackToAskingUser() throws Exception {
        String token = newUser();
        when(geo.locate(anyDouble(), anyDouble())).thenReturn(GeoResult.unavailable());

        byte[] photo = TestPhotos.exifJpeg(40, 30, "2026:11:06 12:00:00", 37.5, 127.0, 1);
        upload(token, List.of(photo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.pages[0].metadataIssues[0]").value("LOCATION_REQUIRED"));
    }

    @Test
    void locationInputAcceptsOnlyFiveDistrictNames() throws Exception {
        String token = newUser();
        long pageId = uploadOne(token);

        for (String invalid : List.of("송파구", "마포", "서대문", "홍대")) {
            send(patch("/api/v1/diary-pages/" + pageId + "/metadata"), token, Map.of("location", Map.of("district", invalid)))
                    .andExpect(status().isUnprocessableContent())
                    .andExpect(jsonPath("$.message").value("5개의 구 외에는 아직 불가능합니다"));
        }
        send(patch("/api/v1/diary-pages/" + pageId + "/metadata"), token, Map.of("location", Map.of("district", " 중구 ")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.region").value("JUNG"))
                .andExpect(jsonPath("$.shareable").value(true));
        send(patch("/api/v1/diary-pages/" + pageId + "/metadata"), token, Map.of("location", Map.of("district", "서대문구")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.region").value("SEODAEMUN"));
    }

    @Test
    void seodaemunPagesAreSavedAndShownInItsCategory() throws Exception {
        String author = newUser();
        String viewer = newUser();
        when(geo.locate(anyDouble(), anyDouble())).thenReturn(GeoResult.supported(Region.SEODAEMUN));
        byte[] photo = TestPhotos.exifJpeg(40, 30, "2026:11:06 12:00:00", 37.5791, 126.9368, 1);
        upload(author, List.of(photo)).andExpect(jsonPath("$.pages[0].region").value("SEODAEMUN"));

        long diaryId = publish(author, List.of("서대문구", "마포구"), DATE);
        send(get("/api/v1/community/diaries").param("region", "SEODAEMUN"), viewer, null)
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].diaryId").value(diaryId))
                .andExpect(jsonPath("$.items[0].pages.length()").value(1))
                .andExpect(jsonPath("$.items[0].pages[0].region").value("SEODAEMUN"));
    }

    @Test
    void unknownLocationBlocksSharing() throws Exception {
        String token = newUser();
        long diaryId = createDiary(token, List.of("UNKNOWN", "마포구"));
        List<Long> pages = pageIds(token, diaryId);

        send(patch("/api/v1/diary-pages/" + pages.get(0)), token, Map.of("visibility", "PUBLIC"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("PAGE_NOT_SHAREABLE"));

        send(post("/api/v1/diaries/" + diaryId + "/complete"), token, Map.of(
                        "visibility", "PUBLIC",
                        "pages", List.of(Map.of("id", pages.get(0), "visibility", "PHOTO_HIDDEN"))))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("PAGE_NOT_SHAREABLE"));
    }

    @Test
    void confirmChecksMetadataAndDateRangeAndSortsByTime() throws Exception {
        String token = newUser();
        JsonNode diary = read(upload(token, List.of(TestPhotos.plainJpeg(), TestPhotos.plainJpeg())));
        long diaryId = diary.path("id").asLong();
        long first = diary.path("pages").get(0).path("id").asLong();
        long second = diary.path("pages").get(1).path("id").asLong();

        send(post("/api/v1/diaries/" + diaryId + "/confirm"), token, null)
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("METADATA_INCOMPLETE"));

        // 다음 날 오전 3시는 같은 일기, 오전 6시는 다음 날짜다
        patchMeta(token, first, Map.of("date", DATE, "time", "20:00", "location", Map.of("district", "마포구")));
        patchMeta(token, second, Map.of("date", "2026-11-07", "time", "06:00", "location", Map.of("district", "강남구")));
        send(post("/api/v1/diaries/" + diaryId + "/confirm"), token, null)
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("DATE_MISMATCH"));

        patchMeta(token, first, Map.of("date", "2026-11-07", "time", "03:00"));
        patchMeta(token, second, Map.of("date", DATE, "time", "20:00"));
        send(post("/api/v1/diaries/" + diaryId + "/confirm"), token, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CREATING"))
                .andExpect(jsonPath("$.logicalDate").value(DATE))
                .andExpect(jsonPath("$.pages[0].id").value(second))
                .andExpect(jsonPath("$.pages[1].id").value(first))
                .andExpect(jsonPath("$.pages[0].imageStatus").value("DONE"))
                .andExpect(jsonPath("$.pages[0].imageSource").value("CONVERTED"));
    }

    @Test
    void uploadLimitIsFourPages() throws Exception {
        String token = newUser();
        byte[] p = TestPhotos.plainJpeg();
        upload(token, List.of(p, p, p, p, p))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PAGE_LIMIT_EXCEEDED"));

        long diaryId = read(upload(token, List.of(p, p, p, p))).path("id").asLong();
        MockMultipartHttpServletRequestBuilder add = multipart("/api/v1/diaries/" + diaryId + "/pages");
        add.file(new MockMultipartFile("photo", "x.jpg", "image/jpeg", p));
        mvc.perform(add.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(jsonPath("$.code").value("PAGE_LIMIT_EXCEEDED"));
    }

    @Test
    void otherUsersCannotTouchMyDiary() throws Exception {
        String owner = newUser();
        String other = newUser();
        long pageId = uploadOne(owner);
        long diaryId = jdbc.sql("SELECT diary_id FROM diary_pages WHERE id = ?").param(pageId).query(Long.class).single();

        send(get("/api/v1/diaries/" + diaryId), other, null).andExpect(status().isNotFound());
        send(delete("/api/v1/diaries/" + diaryId), other, null).andExpect(status().isForbidden());
        patchMetaRaw(other, pageId, Map.of("date", DATE)).andExpect(status().isForbidden());
    }

    // ---------- 변환 실패 ----------

    @Test
    void conversionRetriesOnceThenUserChoosesOriginal() throws Exception {
        String token = newUser();
        when(styler.toAnimeStyle(any())).thenThrow(new AiUnavailableException("실패"));
        long diaryId = createDiary(token, List.of("마포구"));
        long pageId = pageIds(token, diaryId).getFirst();

        Mockito.verify(styler, Mockito.times(2)).toAnimeStyle(any());
        send(get("/api/v1/diaries/" + diaryId), token, null)
                .andExpect(jsonPath("$.pages[0].imageStatus").value("FAILED"))
                .andExpect(jsonPath("$.pages[0].convertedImageUrl").doesNotExist());

        send(post("/api/v1/diary-pages/" + pageId + "/image/use-original"), token, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageStatus").value("DONE"))
                .andExpect(jsonPath("$.imageSource").value("ORIGINAL"));
    }

    @Test
    void replacingFailedPhotoKeepsOtherPagesAndResetsOnlyThatPage() throws Exception {
        String token = newUser();
        long diaryId = createDiary(token, List.of("마포구", "종로구"));
        List<Long> pages = pageIds(token, diaryId);
        chatAndWrite(token, pages.get(0));
        chatAndWrite(token, pages.get(1));

        MockMultipartHttpServletRequestBuilder replace = multipart(HttpMethod.PUT, "/api/v1/diary-pages/" + pages.get(1) + "/photo");
        replace.file(new MockMultipartFile("photo", "x.jpg", "image/jpeg", TestPhotos.plainJpeg()));
        mvc.perform(replace.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").doesNotExist())
                .andExpect(jsonPath("$.chatStatus").value("NOT_STARTED"))
                .andExpect(jsonPath("$.metadataIssues[0]").value("DATE_REQUIRED"));

        send(get("/api/v1/diaries/" + diaryId), token, null)
                .andExpect(jsonPath("$.pages[0].content").value("오늘의 일기"))
                .andExpect(jsonPath("$.pages[0].chatStatus").value("COMPLETED"));

        // 메타데이터를 다시 채우면 변환이 자동으로 시작된다
        patchMeta(token, pages.get(1), Map.of("date", DATE, "location", Map.of("district", "강남구")));
        send(get("/api/v1/diaries/" + diaryId), token, null)
                .andExpect(jsonPath("$.pages[1].imageStatus").value("DONE"));
    }

    @Test
    void failedRegenerationKeepsCurrentImage() throws Exception {
        String token = newUser();
        long diaryId = createDiary(token, List.of("마포구"));
        long pageId = pageIds(token, diaryId).getFirst();

        when(styler.toAnimeStyle(any())).thenThrow(new AiUnavailableException("실패"));
        send(post("/api/v1/diary-pages/" + pageId + "/image/regenerate"), token, null).andExpect(status().isAccepted());

        send(get("/api/v1/diaries/" + diaryId), token, null)
                .andExpect(jsonPath("$.pages[0].imageStatus").value("DONE"))
                .andExpect(jsonPath("$.pages[0].imageSource").value("CONVERTED"))
                .andExpect(jsonPath("$.pages[0].imageError").exists());
    }

    // ---------- 챗봇 ----------

    @Test
    void chatSuggestsFinishAt500AndStopsAt800() throws Exception {
        String token = newUser();
        long diaryId = createDiary(token, List.of("마포구"));
        long pageId = pageIds(token, diaryId).getFirst();
        String chat = "/api/v1/diary-pages/" + pageId + "/chat";

        send(post("/api/v1/diary-pages/" + pageId + "/text/generate"), token, null)
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("NO_USER_MESSAGE"));

        send(post(chat + "/start"), token, null).andExpect(jsonPath("$.message.content").value("첫 질문"));
        send(post(chat + "/start"), token, null).andExpect(jsonPath("$.message.content").value("첫 질문"));
        verify(ai, Mockito.times(1)).firstQuestion(any(), anyString());

        when(ai.nextQuestion(any(), anyString(), any())).thenReturn(new ChatReply("질문", 520));
        send(post(chat + "/messages"), token, Map.of("content", "답변"))
                .andExpect(jsonPath("$.finishSuggested").value(true))
                .andExpect(jsonPath("$.limitReached").value(false));

        when(ai.nextQuestion(any(), anyString(), any())).thenReturn(new ChatReply("질문", 900));
        send(post(chat + "/messages"), token, Map.of("content", "답변"))
                .andExpect(jsonPath("$.estimatedChars").value(800))
                .andExpect(jsonPath("$.limitReached").value(true));
        send(post(chat + "/messages"), token, Map.of("content", "답변"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CHAT_LIMIT_REACHED"));

        send(get(chat + "/messages"), token, null).andExpect(jsonPath("$.items.length()").value(5));
    }

    @Test
    void failedAiReplyDoesNotSaveUserMessage() throws Exception {
        String token = newUser();
        long pageId = pageIds(token, createDiary(token, List.of("마포구"))).getFirst();
        String chat = "/api/v1/diary-pages/" + pageId + "/chat";
        send(post(chat + "/start"), token, null);

        when(ai.nextQuestion(any(), anyString(), any())).thenThrow(new AiUnavailableException("실패"));
        send(post(chat + "/messages"), token, Map.of("content", "답변"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("AI_UNAVAILABLE"));

        send(get(chat + "/messages"), token, null).andExpect(jsonPath("$.items.length()").value(1));
    }

    @Test
    void generatedTextIsCutAt800AndEditsAreLimited() throws Exception {
        String token = newUser();
        when(ai.writeDiary(any(), anyString(), any())).thenReturn("가".repeat(900));
        long pageId = pageIds(token, createDiary(token, List.of("마포구"))).getFirst();
        chatAndWrite(token, pageId);

        String content = jdbc.sql("SELECT content FROM diary_pages WHERE id = ?").param(pageId).query(String.class).single();
        assertThat(content).hasSize(800);

        send(patch("/api/v1/diary-pages/" + pageId), token, Map.of("content", "나".repeat(801)))
                .andExpect(status().isBadRequest());
    }

    // ---------- 저장과 마이페이지 ----------

    @Test
    void completeRequiresImagesAndTextThenListsNewestFirst() throws Exception {
        String token = newUser();
        long older = createDiary(token, List.of("마포구"), "2026-11-01");
        send(post("/api/v1/diaries/" + older + "/complete"), token, Map.of("visibility", "PRIVATE"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("DIARY_INCOMPLETE"));
        finish(token, older, "PRIVATE", "PUBLIC");
        long newer = publish(token, List.of("종로구"), "2026-11-05");

        send(get("/api/v1/me/diaries"), token, null)
                .andExpect(jsonPath("$.items[0].id").value(newer))
                .andExpect(jsonPath("$.items[1].id").value(older))
                .andExpect(jsonPath("$.items[0].thumbnailUrl").exists())
                .andExpect(jsonPath("$.totalElements").value(2));

        send(delete("/api/v1/diaries/" + older), token, null).andExpect(status().isNoContent());
        send(get("/api/v1/me/diaries"), token, null).andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void signedImageUrlWorksWithoutTokenAndRejectsTampering() throws Exception {
        String token = newUser();
        long diaryId = createDiary(token, List.of("마포구"));
        JsonNode page = read(send(get("/api/v1/diaries/" + diaryId), token, null)).path("pages").get(0);
        String url = page.path("convertedImageUrl").asString().replace("http://localhost", "");

        mvc.perform(get(url)).andExpect(status().isOk());
        mvc.perform(get(url.replaceAll("sig=.", "sig=z"))).andExpect(status().isUnauthorized());
    }

    // ---------- 커뮤니티 ----------

    @Test
    void categoryShowsOnlyPagesOfThatRegion() throws Exception {
        String author = newUser();
        String viewer = newUser();
        long diaryId = publish(author, List.of("마포구", "마포구", "종로구", "종로구"), DATE);

        send(get("/api/v1/community/diaries").param("region", "MAPO"), viewer, null)
                .andExpect(jsonPath("$.items[0].diaryId").value(diaryId))
                .andExpect(jsonPath("$.items[0].pages.length()").value(2))
                .andExpect(jsonPath("$.items[0].pages[0].region").value("MAPO"))
                .andExpect(jsonPath("$.items[0].pages[1].region").value("MAPO"));
        send(get("/api/v1/community/diaries/" + diaryId).param("region", "JONGNO"), viewer, null)
                .andExpect(jsonPath("$.pages.length()").value(2))
                .andExpect(jsonPath("$.pages[0].region").value("JONGNO"));
        send(get("/api/v1/community/diaries/" + diaryId).param("region", "GANGNAM"), viewer, null)
                .andExpect(status().isNotFound());
        send(get("/api/v1/community/diaries").param("region", "OTHER"), viewer, null)
                .andExpect(status().isBadRequest());
    }

    @Test
    void visibilityRulesHidePagesAndPhotos() throws Exception {
        String author = newUser();
        String viewer = newUser();
        long diaryId = createDiary(author, List.of("마포구", "마포구", "마포구"));
        List<Long> pages = pageIds(author, diaryId);
        pages.forEach(p -> chatAndWriteUnchecked(author, p));
        send(post("/api/v1/diaries/" + diaryId + "/complete"), author, Map.of(
                        "visibility", "PUBLIC",
                        "pages", List.of(
                                Map.of("id", pages.get(0), "visibility", "PUBLIC"),
                                Map.of("id", pages.get(1), "visibility", "PHOTO_HIDDEN"),
                                Map.of("id", pages.get(2), "visibility", "PRIVATE"))))
                .andExpect(status().isOk());

        send(get("/api/v1/community/diaries/" + diaryId), viewer, null)
                .andExpect(jsonPath("$.pages.length()").value(2))
                .andExpect(jsonPath("$.pages[0].imageUrl").exists())
                .andExpect(jsonPath("$.pages[1].photoHidden").value(true))
                .andExpect(jsonPath("$.pages[1].imageUrl").doesNotExist())
                .andExpect(jsonPath("$.pages[1].content").value("오늘의 일기"));

        send(put("/api/v1/community/pages/" + pages.get(2) + "/reaction"), viewer, Map.of("type", "LIKE"))
                .andExpect(status().isNotFound());

        send(patch("/api/v1/diaries/" + diaryId), author, Map.of("visibility", "PRIVATE")).andExpect(status().isOk());
        send(get("/api/v1/community/diaries/" + diaryId), viewer, null).andExpect(status().isNotFound());

        send(patch("/api/v1/diaries/" + diaryId), author, Map.of("visibility", "PUBLIC")).andExpect(status().isOk());
        send(get("/api/v1/community/diaries/" + diaryId), viewer, null).andExpect(jsonPath("$.pages.length()").value(2));
    }

    @Test
    void feedSortsByScoreAndNeverExposesCounts() throws Exception {
        String author = newUser();
        String u1 = newUser();
        String u2 = newUser();
        long low = publish(author, List.of("마포구"), DATE);
        long high = publish(author, List.of("마포구"), DATE);
        long neutralNewest = publish(author, List.of("마포구"), DATE);

        react(u1, low, "DISLIKE");
        react(u1, high, "LIKE");
        react(u2, high, "LIKE");

        String body = send(get("/api/v1/community/diaries").param("region", "MAPO"), u1, null)
                .andExpect(jsonPath("$.items[0].diaryId").value(high))
                .andExpect(jsonPath("$.items[1].diaryId").value(neutralNewest))
                .andExpect(jsonPath("$.items[2].diaryId").value(low))
                .andExpect(jsonPath("$.items[0].pages[0].myReaction").value("LIKE"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        assertThat(body).doesNotContainIgnoringCase("count").doesNotContain("score");

        long pageId = pageIds(author, low).getFirst();
        String reaction = send(put("/api/v1/community/pages/" + pageId + "/reaction"), u2, Map.of("type", "LIKE"))
                .andExpect(jsonPath("$.myReaction").value("LIKE"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        assertThat(reaction).doesNotContainIgnoringCase("count");

        send(delete("/api/v1/community/pages/" + pageId + "/reaction"), u2, null)
                .andExpect(jsonPath("$.myReaction").doesNotExist());
    }

    @Test
    void threeReportsBlockOnlyThatPageAndOwnerCannotRepublish() throws Exception {
        String author = newUser();
        long diaryId = publish(author, List.of("마포구", "마포구"), DATE);
        List<Long> pages = pageIds(author, diaryId);
        long target = pages.get(0);

        send(post("/api/v1/community/pages/" + target + "/reports"), author, Map.of("reason", "SPAM"))
                .andExpect(status().isForbidden());

        String u1 = newUser();
        report(u1, target).andExpect(status().isCreated());
        report(u1, target).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ALREADY_REPORTED"));
        report(newUser(), target).andExpect(status().isCreated());
        send(get("/api/v1/community/diaries/" + diaryId), u1, null).andExpect(jsonPath("$.pages.length()").value(2));

        report(newUser(), target).andExpect(status().isCreated());
        send(get("/api/v1/community/diaries/" + diaryId), u1, null)
                .andExpect(jsonPath("$.pages.length()").value(1))
                .andExpect(jsonPath("$.pages[0].id").value(pages.get(1)));

        send(get("/api/v1/diaries/" + diaryId), author, null).andExpect(jsonPath("$.pages[0].reportBlocked").value(true));
        send(patch("/api/v1/diary-pages/" + target), author, Map.of("visibility", "PUBLIC"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PAGE_REPORT_BLOCKED"));
    }

    @Test
    void searchOrdersBySimilarityOnlyAndHonorsThresholdAndRegion() throws Exception {
        String author = newUser();
        String viewer = newUser();
        when(ai.writeDiary(any(), anyString(), any())).thenReturn("best", "good", "weak", "other-region", "private");
        when(ai.embedDocument("best")).thenReturn(new float[] {1, 0, 0});
        when(ai.embedDocument("good")).thenReturn(new float[] {0.8f, 0.6f, 0});
        when(ai.embedDocument("weak")).thenReturn(new float[] {0, 1, 0});
        when(ai.embedDocument("other-region")).thenReturn(new float[] {1, 0, 0});
        when(ai.embedQuery("카페")).thenReturn(new float[] {1, 0, 0});

        long best = publish(author, List.of("마포구"), DATE);
        long good = publish(author, List.of("마포구"), DATE);
        publish(author, List.of("마포구"), DATE);
        publish(author, List.of("강남구"), DATE);
        long hidden = publish(author, List.of("마포구"), DATE);
        send(patch("/api/v1/diaries/" + hidden), author, Map.of("visibility", "PRIVATE"));
        when(ai.embedDocument("private")).thenReturn(new float[] {1, 0, 0});
        embeddingJob.run();

        // 가장 비슷한 페이지가 싫어요를 받아도 첫 번째에 와야 한다
        react(viewer, best, "DISLIKE");
        react(viewer, good, "LIKE");

        send(get("/api/v1/community/search").param("q", "카페").param("region", "MAPO"), viewer, null)
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].page.diaryId").value(best))
                .andExpect(jsonPath("$.items[1].page.diaryId").value(good))
                .andExpect(jsonPath("$.items[0].similarity").doesNotExist());

        send(get("/api/v1/community/search").param("q", "카페"), viewer, null)
                .andExpect(jsonPath("$.items.length()").value(3));

        when(ai.embedQuery("무관")).thenReturn(new float[] {0, 0, 1});
        send(get("/api/v1/community/search").param("q", "무관"), viewer, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void editingTextRebuildsEmbedding() throws Exception {
        String author = newUser();
        when(ai.embedDocument(anyString())).thenReturn(new float[] {1, 0, 0});
        long pageId = pageIds(author, publish(author, List.of("마포구"), DATE)).getFirst();
        embeddingJob.run();
        assertThat(embeddingCount()).isEqualTo(1);

        send(patch("/api/v1/diary-pages/" + pageId), author, Map.of("content", "고친 글")).andExpect(status().isOk());
        assertThat(embeddingCount()).isZero();

        embeddingJob.run();
        verify(ai).embedDocument(eq("고친 글"));
        assertThat(embeddingCount()).isEqualTo(1);
    }

    // ---------- 도우미 ----------

    private long embeddingCount() {
        return jdbc.sql("SELECT COUNT(*) FROM page_embeddings").query(Long.class).single();
    }

    private String newUser() throws Exception {
        String email = "user" + (++userCounter) + "-" + System.nanoTime() + "@example.com";
        send(post("/api/v1/auth/signup"), null, Map.of(
                        "email", email, "password", "password123", "nickname", "유저" + System.nanoTime() % 100000000L))
                .andExpect(status().isCreated());
        JsonNode tokens = read(send(post("/api/v1/auth/email/verify"), null, Map.of("email", email, "code", sentCode(email))));
        return tokens.path("accessToken").asString();
    }

    private String sentCode(String email) {
        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        verify(mail, Mockito.atLeastOnce()).send(eq(email), code.capture());
        return code.getValue();
    }

    private ResultActions send(MockHttpServletRequestBuilder request, String token, Object body) throws Exception {
        if (token != null) {
            request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }
        if (body != null) {
            request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        }
        return mvc.perform(request);
    }

    private JsonNode read(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }

    private ResultActions upload(String token, List<byte[]> photos) throws Exception {
        MockMultipartHttpServletRequestBuilder request = multipart("/api/v1/diaries");
        for (byte[] photo : photos) {
            request.file(new MockMultipartFile("photos", "photo.jpg", "image/jpeg", photo));
        }
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
    }

    private long uploadOne(String token) throws Exception {
        return read(upload(token, List.of(TestPhotos.plainJpeg()))).path("pages").get(0).path("id").asLong();
    }

    private ResultActions patchMetaRaw(String token, long pageId, Map<String, Object> body) throws Exception {
        return send(patch("/api/v1/diary-pages/" + pageId + "/metadata"), token, body);
    }

    private void patchMeta(String token, long pageId, Map<String, Object> body) throws Exception {
        patchMetaRaw(token, pageId, body).andExpect(status().isOk());
    }

    private long createDiary(String token, List<String> districts) throws Exception {
        return createDiary(token, districts, DATE);
    }

    /** 업로드, 메타데이터 입력, 확정까지 진행한다. "UNKNOWN"은 모르겠습니다를 뜻한다. */
    private long createDiary(String token, List<String> districts, String date) throws Exception {
        List<byte[]> photos = new ArrayList<>();
        districts.forEach(d -> photos.add(TestPhotos.plainJpeg()));
        JsonNode diary = read(upload(token, photos));
        long diaryId = diary.path("id").asLong();
        for (int i = 0; i < districts.size(); i++) {
            Map<String, Object> location = districts.get(i).equals("UNKNOWN")
                    ? Map.of("unknown", true)
                    : Map.of("district", districts.get(i));
            patchMeta(token, diary.path("pages").get(i).path("id").asLong(), Map.of("date", date, "location", location));
        }
        send(post("/api/v1/diaries/" + diaryId + "/confirm"), token, null).andExpect(status().isOk());
        return diaryId;
    }

    private List<Long> pageIds(String token, long diaryId) throws Exception {
        List<Long> ids = new ArrayList<>();
        read(send(get("/api/v1/diaries/" + diaryId), token, null)).path("pages").forEach(p -> ids.add(p.path("id").asLong()));
        return ids;
    }

    private void chatAndWrite(String token, long pageId) throws Exception {
        String chat = "/api/v1/diary-pages/" + pageId + "/chat";
        send(post(chat + "/start"), token, null).andExpect(status().isOk());
        send(post(chat + "/messages"), token, Map.of("content", "답변")).andExpect(status().isOk());
        send(post("/api/v1/diary-pages/" + pageId + "/text/generate"), token, null).andExpect(status().isOk());
    }

    private void chatAndWriteUnchecked(String token, long pageId) {
        try {
            chatAndWrite(token, pageId);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private void finish(String token, long diaryId, String diaryVisibility, String pageVisibility) throws Exception {
        List<Long> pages = pageIds(token, diaryId);
        for (long pageId : pages) {
            chatAndWrite(token, pageId);
        }
        send(post("/api/v1/diaries/" + diaryId + "/complete"), token, Map.of(
                        "visibility", diaryVisibility,
                        "pages", pages.stream().map(id -> Map.of("id", id, "visibility", pageVisibility)).toList()))
                .andExpect(status().isOk());
    }

    private long publish(String token, List<String> districts, String date) throws Exception {
        long diaryId = createDiary(token, districts, date);
        finish(token, diaryId, "PUBLIC", "PUBLIC");
        return diaryId;
    }

    private void react(String token, long diaryId, String type) throws Exception {
        long owner = jdbc.sql("SELECT id FROM diary_pages WHERE diary_id = ? ORDER BY sort_order LIMIT 1")
                .param(diaryId)
                .query(Long.class)
                .single();
        send(put("/api/v1/community/pages/" + owner + "/reaction"), token, Map.of("type", type)).andExpect(status().isOk());
    }

    private ResultActions report(String token, long pageId) throws Exception {
        return send(post("/api/v1/community/pages/" + pageId + "/reports"), token, Map.of("reason", "SPAM"));
    }
}

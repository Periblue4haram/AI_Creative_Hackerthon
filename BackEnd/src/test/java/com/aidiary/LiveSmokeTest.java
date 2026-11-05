package com.aidiary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.aidiary.ai.AiGateway.ChatReply;
import com.aidiary.ai.AiGateway.Turn;
import com.aidiary.ai.GeminiGateway;
import com.aidiary.ai.ImageStyler.GeneratedImage;
import com.aidiary.ai.CloudflareImageStyler;
import com.aidiary.geo.GeoLocator.GeoResult;
import com.aidiary.geo.NaverGeoLocator;
import com.aidiary.geo.Region;
import java.awt.Color;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/**
 * 실제 .env의 키로 외부 서비스를 호출한다. 비용이 들 수 있어 기본 테스트에서는 실행하지 않는다.
 * 실행: mvn test -Dtest=LiveSmokeTest -Dlive.smoke=true
 * 메일은 발송하지 않고 SMTP 로그인만 확인한다.
 */
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:mysql://localhost:3306/ai_diary?createDatabaseIfNotExist=true&serverTimezone=Asia/Seoul&characterEncoding=UTF-8"
})
@EnabledIfSystemProperty(named = "live.smoke", matches = "true")
class LiveSmokeTest {

    private static final String CONTEXT = "사진 정보 - 날짜: 2026-11-06, 장소: 서울 마포구";

    @Autowired GeminiGateway gemini;
    @Autowired CloudflareImageStyler styler;
    @Value("${app.cloudflare.api-token:}") String cloudflareToken;
    @Autowired NaverGeoLocator naver;
    @Autowired JavaMailSenderImpl mail;

    @Test
    void naverDistinguishesSeoulDistricts() {
        assertThat(naver.locate(37.5563, 126.9246)).isEqualTo(GeoResult.supported(Region.MAPO));
        // 서울 중구와 이름이 같은 부산 중구
        assertThat(naver.locate(35.1064, 129.0323).status()).isEqualTo(GeoResult.Status.OUTSIDE);
    }

    @Test
    void geminiChatAndDiary() throws Exception {
        byte[] photo = samplePhoto();
        String first = gemini.firstQuestion(photo, CONTEXT);
        assertThat(first).isNotBlank();

        List<Turn> history = List.of(new Turn(false, first), new Turn(true, "해 질 무렵 공원을 산책했는데 하늘 색이 정말 예뻤어요."));
        ChatReply reply = gemini.nextQuestion(photo, CONTEXT, history);
        assertThat(reply.question()).isNotBlank();

        String diary = gemini.writeDiary(photo, CONTEXT, history);
        System.out.println("[live] 첫 질문: " + first);
        System.out.println("[live] 다음 질문(" + reply.estimatedChars() + "자): " + reply.question());
        System.out.println("[live] 일기(" + diary.length() + "자): " + diary);
        assertThat(diary).isNotBlank();
    }

    @Test
    void geminiEmbedding() {
        float[] vector = gemini.embedQuery("조용한 카페");
        System.out.println("[live] 임베딩 차원: " + vector.length);
        assertThat(vector).hasSize(768);
    }

    @Test
    void cloudflareImageConversionKeepsSize() throws Exception {
        assumeTrue(cloudflareToken != null && !cloudflareToken.isBlank(), "CLOUDFLARE_API_TOKEN이 비어 있습니다");
        GeneratedImage image = styler.toAnimeStyle(samplePhoto());
        Path out = Path.of("target", "live-anime.jpg");
        Files.write(out, image.bytes());
        BufferedImage result = ImageIO.read(out.toFile());
        System.out.println("[live] 변환 이미지: " + result.getWidth() + "x" + result.getHeight() + ", " + image.bytes().length + " bytes, " + out);
        assertThat(result.getWidth()).isEqualTo(640);
        assertThat(result.getHeight()).isEqualTo(480);
    }

    /** 모델 출력 한도(1920px)보다 큰 사진도 원본 크기로 되돌아와야 한다. */
    @Test
    void cloudflareLargePhotoKeepsSize() throws Exception {
        assumeTrue(cloudflareToken != null && !cloudflareToken.isBlank(), "CLOUDFLARE_API_TOKEN이 비어 있습니다");
        BufferedImage source = ImageIO.read(new java.io.ByteArrayInputStream(samplePhoto()));
        ByteArrayOutputStream large = new ByteArrayOutputStream();
        ImageIO.write(com.aidiary.image.ImageCodec.resize(source, 2048, 1536), "jpeg", large);

        GeneratedImage image = styler.toAnimeStyle(large.toByteArray());
        BufferedImage result = ImageIO.read(new java.io.ByteArrayInputStream(image.bytes()));
        System.out.println("[live] 큰 사진 변환: " + result.getWidth() + "x" + result.getHeight());
        assertThat(result.getWidth()).isEqualTo(2048);
        assertThat(result.getHeight()).isEqualTo(1536);
    }

    @Test
    void smtpLoginWorks() throws Exception {
        mail.testConnection();
    }

    /** 노을 진 공원을 단순하게 그린 시험용 이미지. */
    private static byte[] samplePhoto() throws Exception {
        BufferedImage image = new BufferedImage(640, 480, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setPaint(new GradientPaint(0, 0, new Color(250, 150, 90), 0, 320, new Color(120, 130, 200)));
        g.fillRect(0, 0, 640, 320);
        g.setColor(new Color(70, 120, 70));
        g.fillRect(0, 320, 640, 160);
        g.setColor(new Color(60, 40, 30));
        g.fillRect(300, 200, 30, 130);
        g.setColor(new Color(40, 90, 50));
        g.fillOval(240, 120, 150, 120);
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "jpeg", out);
        return out.toByteArray();
    }
}

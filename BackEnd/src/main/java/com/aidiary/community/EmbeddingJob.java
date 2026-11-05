package com.aidiary.community;

import com.aidiary.ai.AiGateway;
import com.aidiary.ai.AiUnavailableException;
import com.aidiary.community.EmbeddingRepository.PendingPage;
import com.aidiary.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** 임베딩이 없는 공개 페이지를 주기적으로 찾아 만든다. 실패하면 다음 주기에 다시 시도한다. */
@Component
public class EmbeddingJob {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingJob.class);
    private static final int BATCH_SIZE = 50;

    private final EmbeddingRepository embeddings;
    private final AiGateway ai;
    private final String model;

    public EmbeddingJob(EmbeddingRepository embeddings, AiGateway ai, AppProperties props) {
        this.embeddings = embeddings;
        this.ai = ai;
        this.model = props.gemini().embeddingModel();
    }

    @Scheduled(
            initialDelayString = "${app.embedding.delay-ms}",
            fixedDelayString = "${app.embedding.delay-ms}")
    public void run() {
        for (PendingPage page : embeddings.findPublicWithoutEmbedding(BATCH_SIZE)) {
            try {
                float[] vector = ai.embedDocument(page.content());
                embeddings.saveIfContentUnchanged(page.pageId(), page.content(), model, vector);
            } catch (AiUnavailableException e) {
                log.warn("임베딩 생성 실패: page={}, {}", page.pageId(), e.getMessage());
                return;
            }
        }
    }
}

package com.aidiary.community;

import com.aidiary.geo.Region;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** 임베딩은 float32 little-endian 배열로 저장하고 항상 정규화된 벡터만 다룬다. */
@Repository
public class EmbeddingRepository {

    public record PendingPage(Long pageId, String content) {}

    public record StoredEmbedding(Long pageId, float[] vector) {}

    private final JdbcClient jdbc;

    public EmbeddingRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void delete(Long pageId) {
        jdbc.sql("DELETE FROM page_embeddings WHERE page_id = :id").param("id", pageId).update();
    }

    public List<PendingPage> findPublicWithoutEmbedding(int limit) {
        return jdbc.sql("""
                        SELECT p.id, p.content
                        FROM diary_pages p
                        JOIN diaries d ON d.id = p.diary_id
                        LEFT JOIN page_embeddings e ON e.page_id = p.id
                        WHERE e.page_id IS NULL AND p.content IS NOT NULL AND
                        """ + PublicPages.SQL_CONDITION + " LIMIT :limit")
                .param("limit", limit)
                .query((rs, n) -> new PendingPage(rs.getLong(1), rs.getString(2)))
                .list();
    }

    /** 임베딩을 만드는 동안 글이 바뀌었다면 저장하지 않는다. 다음 주기에 새 글로 다시 만든다. */
    public void saveIfContentUnchanged(Long pageId, String content, String model, float[] vector) {
        jdbc.sql("""
                        INSERT INTO page_embeddings (page_id, model, dimensions, embedding)
                        SELECT p.id, :model, :dimensions, :embedding
                        FROM diary_pages p
                        WHERE p.id = :pageId AND p.content = :content
                        ON DUPLICATE KEY UPDATE model = VALUES(model), dimensions = VALUES(dimensions),
                          embedding = VALUES(embedding)
                        """)
                .param("model", model)
                .param("dimensions", vector.length)
                .param("embedding", toBytes(normalize(vector)))
                .param("pageId", pageId)
                .param("content", content)
                .update();
    }

    public List<StoredEmbedding> findPublic(Region region, String model, int dimensions) {
        String regionFilter = region == null ? "" : " AND p.region = :region";
        var spec = jdbc.sql("""
                        SELECT e.page_id, e.embedding
                        FROM page_embeddings e
                        JOIN diary_pages p ON p.id = e.page_id
                        JOIN diaries d ON d.id = p.diary_id
                        WHERE e.model = :model AND e.dimensions = :dimensions AND
                        """ + PublicPages.SQL_CONDITION + regionFilter)
                .param("model", model)
                .param("dimensions", dimensions);
        if (region != null) {
            spec = spec.param("region", region.name());
        }
        return spec.query((rs, n) -> new StoredEmbedding(rs.getLong(1), fromBytes(rs.getBytes(2)))).list();
    }

    public static float[] normalize(float[] vector) {
        double sum = 0;
        for (float v : vector) {
            sum += v * v;
        }
        double length = Math.sqrt(sum);
        if (length == 0) {
            return vector;
        }
        float[] normalized = new float[vector.length];
        for (int i = 0; i < vector.length; i++) {
            normalized[i] = (float) (vector[i] / length);
        }
        return normalized;
    }

    private static byte[] toBytes(float[] vector) {
        ByteBuffer buffer = ByteBuffer.allocate(vector.length * Float.BYTES).order(ByteOrder.LITTLE_ENDIAN);
        buffer.asFloatBuffer().put(vector);
        return buffer.array();
    }

    private static float[] fromBytes(byte[] bytes) {
        float[] vector = new float[bytes.length / Float.BYTES];
        ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).asFloatBuffer().get(vector);
        return vector;
    }
}

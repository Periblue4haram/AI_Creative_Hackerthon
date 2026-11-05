package com.aidiary.community;

import com.aidiary.diary.DiaryEnums.ImageSource;
import com.aidiary.geo.Region;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class CommunityDtos {

    private CommunityDtos() {}

    public enum ReactionType {
        LIKE,
        DISLIKE
    }

    public enum ReportReason {
        SPAM,
        INAPPROPRIATE,
        PRIVACY,
        OTHER
    }

    /** 좋아요 수와 싫어요 수는 정렬에만 쓰므로 응답에 넣지 않는다. */
    public record PublicPage(
            Long id,
            Long diaryId,
            int sortOrder,
            Region region,
            LocalDate logicalDate,
            String imageUrl,
            ImageSource imageSource,
            boolean photoHidden,
            String content,
            ReactionType myReaction) {}

    public record Author(String nickname) {}

    public record PublicDiary(
            Long diaryId, Author author, LocalDate logicalDate, OffsetDateTime publishedAt, List<PublicPage> pages) {}

    public record SearchItem(Author author, PublicPage page) {}

    public record SearchResponse(List<SearchItem> items) {}

    public record ReactionRequest(@NotNull ReactionType type) {}

    public record ReactionResponse(ReactionType myReaction) {}

    public record ReportRequest(@NotNull ReportReason reason, @Size(max = 500) String detail) {}
}

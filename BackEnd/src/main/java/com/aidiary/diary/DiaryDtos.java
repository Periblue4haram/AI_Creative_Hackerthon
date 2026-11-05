package com.aidiary.diary;

import com.aidiary.diary.DiaryEnums.ChatStatus;
import com.aidiary.diary.DiaryEnums.DateSource;
import com.aidiary.diary.DiaryEnums.DiaryStatus;
import com.aidiary.diary.DiaryEnums.DiaryVisibility;
import com.aidiary.diary.DiaryEnums.ImageSource;
import com.aidiary.diary.DiaryEnums.ImageStatus;
import com.aidiary.diary.DiaryEnums.LocationSource;
import com.aidiary.diary.DiaryEnums.MessageRole;
import com.aidiary.diary.DiaryEnums.MetadataIssue;
import com.aidiary.diary.DiaryEnums.PageVisibility;
import com.aidiary.geo.Region;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

public final class DiaryDtos {

    public static final int MAX_CONTENT_CHARS = 800;

    private DiaryDtos() {}

    public record OwnerPage(
            Long id,
            int sortOrder,
            OffsetDateTime takenAt,
            LocalDate logicalDate,
            DateSource dateSource,
            Region region,
            LocationSource locationSource,
            String originalImageUrl,
            String convertedImageUrl,
            ImageStatus imageStatus,
            ImageSource imageSource,
            String imageError,
            ChatStatus chatStatus,
            int estimatedChars,
            String content,
            PageVisibility visibility,
            boolean shareable,
            boolean reportBlocked,
            List<MetadataIssue> metadataIssues) {}

    public record OwnerDiary(
            Long id,
            DiaryStatus status,
            LocalDate logicalDate,
            DiaryVisibility visibility,
            String templateId,
            OffsetDateTime publishedAt,
            OffsetDateTime completedAt,
            List<OwnerPage> pages) {}

    public record DiarySummary(
            Long id,
            LocalDate logicalDate,
            DiaryVisibility visibility,
            int pageCount,
            String thumbnailUrl,
            String preview,
            OffsetDateTime completedAt) {}

    public record LocationInput(Boolean unknown, String district) {}

    public record MetadataRequest(LocalDate date, LocalTime time, LocationInput location) {}

    public record CompletePage(
            @NotNull Long id, @Size(min = 1, max = MAX_CONTENT_CHARS) String content, PageVisibility visibility) {}

    public record CompleteRequest(
            @NotNull DiaryVisibility visibility,
            @Size(min = 1, max = 50) String templateId,
            @Size(max = 4) List<@Valid CompletePage> pages) {}

    public record UpdateDiaryRequest(DiaryVisibility visibility, @Size(min = 1, max = 50) String templateId) {}

    public record UpdatePageRequest(@Size(min = 1, max = MAX_CONTENT_CHARS) String content, PageVisibility visibility) {}

    public record ChatMessageDto(Long id, MessageRole role, String content, OffsetDateTime createdAt) {}

    public record ChatTurnResponse(
            ChatMessageDto message,
            ChatStatus chatStatus,
            int estimatedChars,
            boolean finishSuggested,
            boolean limitReached) {}

    public record ChatHistoryResponse(
            List<ChatMessageDto> items,
            ChatStatus chatStatus,
            int estimatedChars,
            boolean finishSuggested,
            boolean limitReached) {}

    public record SendMessageRequest(@NotBlank @Size(max = 500) String content) {}
}

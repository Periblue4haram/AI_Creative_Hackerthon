package com.aidiary.diary;

import com.aidiary.common.PageResponse;
import com.aidiary.diary.DiaryDtos.ChatHistoryResponse;
import com.aidiary.diary.DiaryDtos.ChatTurnResponse;
import com.aidiary.diary.DiaryDtos.CompleteRequest;
import com.aidiary.diary.DiaryDtos.DiarySummary;
import com.aidiary.diary.DiaryDtos.MetadataRequest;
import com.aidiary.diary.DiaryDtos.OwnerDiary;
import com.aidiary.diary.DiaryDtos.OwnerPage;
import com.aidiary.diary.DiaryDtos.SendMessageRequest;
import com.aidiary.diary.DiaryDtos.UpdateDiaryRequest;
import com.aidiary.diary.DiaryDtos.UpdatePageRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
public class DiaryController {

    private final DiaryService diaries;
    private final ChatService chat;

    public DiaryController(DiaryService diaries, ChatService chat) {
        this.diaries = diaries;
        this.chat = chat;
    }

    private static Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }

    @PostMapping("/diaries")
    @ResponseStatus(HttpStatus.CREATED)
    public OwnerDiary create(@AuthenticationPrincipal Jwt jwt, @RequestPart("photos") List<MultipartFile> photos) {
        return diaries.create(userId(jwt), photos);
    }

    @GetMapping("/diaries/{diaryId}")
    public OwnerDiary get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long diaryId) {
        return diaries.get(userId(jwt), diaryId);
    }

    @PatchMapping("/diaries/{diaryId}")
    public OwnerDiary update(
            @AuthenticationPrincipal Jwt jwt, @PathVariable Long diaryId, @Valid @RequestBody UpdateDiaryRequest request) {
        return diaries.updateDiary(userId(jwt), diaryId, request);
    }

    @DeleteMapping("/diaries/{diaryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long diaryId) {
        diaries.deleteDiary(userId(jwt), diaryId);
    }

    @PostMapping("/diaries/{diaryId}/pages")
    @ResponseStatus(HttpStatus.CREATED)
    public OwnerPage addPage(
            @AuthenticationPrincipal Jwt jwt, @PathVariable Long diaryId, @RequestPart("photo") MultipartFile photo) {
        return diaries.addPage(userId(jwt), diaryId, photo);
    }

    @PostMapping("/diaries/{diaryId}/confirm")
    public OwnerDiary confirm(@AuthenticationPrincipal Jwt jwt, @PathVariable Long diaryId) {
        return diaries.confirm(userId(jwt), diaryId);
    }

    @PostMapping("/diaries/{diaryId}/complete")
    public OwnerDiary complete(
            @AuthenticationPrincipal Jwt jwt, @PathVariable Long diaryId, @Valid @RequestBody CompleteRequest request) {
        return diaries.complete(userId(jwt), diaryId, request);
    }

    @PatchMapping("/diary-pages/{pageId}/metadata")
    public OwnerPage metadata(
            @AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId, @RequestBody MetadataRequest request) {
        return diaries.updateMetadata(userId(jwt), pageId, request);
    }

    @PutMapping("/diary-pages/{pageId}/photo")
    public OwnerPage replacePhoto(
            @AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId, @RequestPart("photo") MultipartFile photo) {
        return diaries.replacePhoto(userId(jwt), pageId, photo);
    }

    @PatchMapping("/diary-pages/{pageId}")
    public OwnerPage updatePage(
            @AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId, @Valid @RequestBody UpdatePageRequest request) {
        return diaries.updatePage(userId(jwt), pageId, request);
    }

    @DeleteMapping("/diary-pages/{pageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePage(@AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId) {
        diaries.deletePage(userId(jwt), pageId);
    }

    @PostMapping("/diary-pages/{pageId}/image/regenerate")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public OwnerPage regenerate(@AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId) {
        return diaries.regenerateImage(userId(jwt), pageId);
    }

    @PostMapping("/diary-pages/{pageId}/image/use-original")
    public OwnerPage useOriginal(@AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId) {
        return diaries.useOriginalImage(userId(jwt), pageId);
    }

    @PostMapping("/diary-pages/{pageId}/chat/start")
    public ChatTurnResponse startChat(@AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId) {
        return chat.start(userId(jwt), pageId);
    }

    @GetMapping("/diary-pages/{pageId}/chat/messages")
    public ChatHistoryResponse history(@AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId) {
        return chat.history(userId(jwt), pageId);
    }

    @PostMapping("/diary-pages/{pageId}/chat/messages")
    public ChatTurnResponse send(
            @AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId, @Valid @RequestBody SendMessageRequest request) {
        return chat.send(userId(jwt), pageId, request.content());
    }

    @PostMapping("/diary-pages/{pageId}/text/generate")
    public OwnerPage generateText(@AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId) {
        return chat.generateText(userId(jwt), pageId);
    }

    @GetMapping("/me/diaries")
    public PageResponse<DiarySummary> mine(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return diaries.listMine(userId(jwt), page, size);
    }
}

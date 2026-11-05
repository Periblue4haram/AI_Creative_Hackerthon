package com.aidiary.community;

import com.aidiary.common.PageResponse;
import com.aidiary.community.CommunityDtos.PublicDiary;
import com.aidiary.community.CommunityDtos.ReactionRequest;
import com.aidiary.community.CommunityDtos.ReactionResponse;
import com.aidiary.community.CommunityDtos.ReportRequest;
import com.aidiary.community.CommunityDtos.SearchResponse;
import com.aidiary.geo.Region;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/community")
public class CommunityController {

    private final CommunityService community;

    public CommunityController(CommunityService community) {
        this.community = community;
    }

    private static Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }

    @GetMapping("/diaries")
    public PageResponse<PublicDiary> feed(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Region region,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return community.feed(userId(jwt), region, page, size);
    }

    @GetMapping("/diaries/{diaryId}")
    public PublicDiary detail(
            @AuthenticationPrincipal Jwt jwt, @PathVariable Long diaryId, @RequestParam(required = false) Region region) {
        return community.detail(userId(jwt), diaryId, region);
    }

    @GetMapping("/search")
    public SearchResponse search(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam @NotBlank @Size(max = 200) String q,
            @RequestParam(required = false) Region region,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit) {
        return community.search(userId(jwt), q, region, limit);
    }

    @PutMapping("/pages/{pageId}/reaction")
    public ReactionResponse react(
            @AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId, @Valid @RequestBody ReactionRequest request) {
        return community.react(userId(jwt), pageId, request.type());
    }

    @DeleteMapping("/pages/{pageId}/reaction")
    public ReactionResponse removeReaction(@AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId) {
        return community.removeReaction(userId(jwt), pageId);
    }

    @PostMapping("/pages/{pageId}/reports")
    @ResponseStatus(HttpStatus.CREATED)
    public void report(
            @AuthenticationPrincipal Jwt jwt, @PathVariable Long pageId, @Valid @RequestBody ReportRequest request) {
        community.report(userId(jwt), pageId, request);
    }
}

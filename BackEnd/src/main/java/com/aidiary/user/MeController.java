package com.aidiary.user;

import com.aidiary.user.ProfileService.FaceDataResponse;
import com.aidiary.user.ProfileService.MeResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** 마이페이지: 프로필(M1), 프로필 수정(M2), 개인정보 관리(M4), 얼굴 데이터 관리(M5). */
@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    public record UpdateMeRequest(@NotBlank @Size(min = 2, max = 30) String nickname) {}

    public record FaceSettingRequest(@NotNull Boolean enabled) {}

    private final ProfileService profiles;

    public MeController(ProfileService profiles) {
        this.profiles = profiles;
    }

    private static Long userId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }

    @GetMapping
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        return profiles.me(userId(jwt));
    }

    @PatchMapping
    public MeResponse update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateMeRequest request) {
        return profiles.updateNickname(userId(jwt), request.nickname());
    }

    @PutMapping("/profile-image")
    public MeResponse setProfileImage(@AuthenticationPrincipal Jwt jwt, @RequestPart("image") MultipartFile image) {
        return profiles.setProfileImage(userId(jwt), image);
    }

    @DeleteMapping("/profile-image")
    public MeResponse clearProfileImage(@AuthenticationPrincipal Jwt jwt) {
        return profiles.clearProfileImage(userId(jwt));
    }

    @GetMapping("/face-data")
    public FaceDataResponse faceData(@AuthenticationPrincipal Jwt jwt) {
        return profiles.faceData(userId(jwt));
    }

    @PostMapping("/face-data")
    @ResponseStatus(HttpStatus.CREATED)
    public FaceDataResponse registerFace(@AuthenticationPrincipal Jwt jwt, @RequestPart("image") MultipartFile image) {
        return profiles.registerFace(userId(jwt), image);
    }

    @PatchMapping("/face-data")
    public FaceDataResponse setFaceEnabled(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody FaceSettingRequest request) {
        return profiles.setFaceEnabled(userId(jwt), request.enabled());
    }

    @DeleteMapping("/face-data")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteFace(@AuthenticationPrincipal Jwt jwt) {
        profiles.deleteFace(userId(jwt));
    }
}

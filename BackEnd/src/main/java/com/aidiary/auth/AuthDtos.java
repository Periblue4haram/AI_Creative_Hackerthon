package com.aidiary.auth;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {}

    /** privacyAgreed는 개인정보처리방침 필수 동의이며 true여야 한다. 닉네임은 다른 사람과 같아도 된다. */
    public record SignupRequest(
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(min = 8) String password,
            @NotBlank @Size(min = 2, max = 30) String nickname,
            @NotNull @AssertTrue Boolean privacyAgreed) {}

    public record SignupResponse(String email, boolean verificationRequired, int expiresIn) {}

    public record VerifyRequest(@NotBlank @Email String email, @NotBlank @Pattern(regexp = "\\d{6}") String code) {}

    public record ResendRequest(@NotBlank @Email String email) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    public record GoogleRequest(@NotBlank String idToken) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record AuthUser(Long id, String email, String nickname) {}

    public record AuthTokens(String accessToken, String refreshToken, long expiresIn, AuthUser user) {}
}

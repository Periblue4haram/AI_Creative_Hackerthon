package com.aidiary.auth;

import com.aidiary.auth.AuthDtos.AuthTokens;
import com.aidiary.auth.AuthDtos.GoogleRequest;
import com.aidiary.auth.AuthDtos.LoginRequest;
import com.aidiary.auth.AuthDtos.RefreshRequest;
import com.aidiary.auth.AuthDtos.ResendRequest;
import com.aidiary.auth.AuthDtos.SignupRequest;
import com.aidiary.auth.AuthDtos.SignupResponse;
import com.aidiary.auth.AuthDtos.VerifyRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public SignupResponse signup(@Valid @RequestBody SignupRequest request) {
        auth.signup(request.email(), request.password(), request.nickname());
        return new SignupResponse(request.email().strip().toLowerCase(), true, (int) AuthService.CODE_TTL.toSeconds());
    }

    @PostMapping("/email/verify")
    public AuthTokens verify(@Valid @RequestBody VerifyRequest request) {
        return auth.verifyEmail(request.email(), request.code());
    }

    @PostMapping("/email/resend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resend(@Valid @RequestBody ResendRequest request) {
        auth.resendCode(request.email());
    }

    @PostMapping("/login")
    public AuthTokens login(@Valid @RequestBody LoginRequest request) {
        return auth.login(request.email(), request.password());
    }

    @PostMapping("/google")
    public ResponseEntity<AuthTokens> google(@Valid @RequestBody GoogleRequest request) {
        AuthService.GoogleLogin result = auth.loginWithGoogle(request.idToken());
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.tokens());
    }

    @PostMapping("/refresh")
    public AuthTokens refresh(@Valid @RequestBody RefreshRequest request) {
        return auth.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody RefreshRequest request) {
        auth.logout(request.refreshToken());
    }
}

package com.aidiary.user;

import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import com.aidiary.common.Times;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    public record MeResponse(Long id, String email, String nickname, OffsetDateTime createdAt) {
        static MeResponse of(User user) {
            return new MeResponse(user.id, user.email, user.nickname, Times.offset(user.createdAt));
        }
    }

    public record UpdateMeRequest(@NotBlank @Size(min = 2, max = 30) String nickname) {}

    private final UserRepository users;

    public MeController(UserRepository users) {
        this.users = users;
    }

    @GetMapping
    public MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        return MeResponse.of(load(jwt));
    }

    @PatchMapping
    public MeResponse update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateMeRequest request) {
        User user = load(jwt);
        String nickname = request.nickname().strip();
        if (!nickname.equals(user.nickname) && users.existsByNickname(nickname)) {
            throw new ApiException(ErrorCode.NICKNAME_TAKEN);
        }
        user.nickname = nickname;
        try {
            return MeResponse.of(users.save(user));
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(ErrorCode.NICKNAME_TAKEN);
        }
    }

    private User load(Jwt jwt) {
        return users.findById(Long.valueOf(jwt.getSubject()))
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
    }
}

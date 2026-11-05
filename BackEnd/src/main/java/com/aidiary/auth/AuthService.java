package com.aidiary.auth;

import com.aidiary.auth.AuthDtos.AuthTokens;
import com.aidiary.auth.GoogleTokenVerifier.GoogleUser;
import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import com.aidiary.common.Hashes;
import com.aidiary.common.Times;
import com.aidiary.config.AppProperties;
import com.aidiary.user.User;
import com.aidiary.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AuthService {

    public static final Duration CODE_TTL = Duration.ofMinutes(10);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_CODE_ATTEMPTS = 5;
    private static final int BCRYPT_MAX_BYTES = 72;
    /** 없는 이메일과 있는 이메일의 로그인 응답 시간을 맞추기 위한 값이다. */
    private final String dummyHash;

    private final UserRepository users;
    private final EmailVerificationRepository verifications;
    private final RefreshTokenRepository refreshTokens;
    private final TokenIssuer tokens;
    private final PasswordEncoder passwordEncoder;
    private final VerificationMailSender mail;
    private final GoogleTokenVerifier google;
    private final AppProperties props;
    private final TransactionTemplate tx;
    private final SecureRandom random = new SecureRandom();

    public AuthService(
            UserRepository users,
            EmailVerificationRepository verifications,
            RefreshTokenRepository refreshTokens,
            TokenIssuer tokens,
            PasswordEncoder passwordEncoder,
            VerificationMailSender mail,
            GoogleTokenVerifier google,
            AppProperties props,
            PlatformTransactionManager transactionManager) {
        this.users = users;
        this.verifications = verifications;
        this.refreshTokens = refreshTokens;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.mail = mail;
        this.google = google;
        this.props = props;
        this.tx = new TransactionTemplate(transactionManager);
        this.dummyHash = passwordEncoder.encode("dummy-password-for-timing");
    }

    public void signup(String rawEmail, String password, String rawNickname) {
        if (password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        String email = normalize(rawEmail);
        String nickname = rawNickname.strip();
        String hash = passwordEncoder.encode(password);
        String code = newCode();
        try {
            tx.executeWithoutResult(s -> {
                User user = users.findByEmail(email).orElse(null);
                if (user != null && user.isVerified()) {
                    throw new ApiException(ErrorCode.EMAIL_TAKEN);
                }
                if (user == null) {
                    user = new User(email, nickname);
                } else {
                    // 다른 사람이 먼저 가입해 두어도 실제 메일 주인이 가입할 수 있도록 미인증 계정은 덮어쓴다
                    checkCooldown(user.id);
                    user.nickname = nickname;
                }
                user.passwordHash = hash;
                user.privacyAgreedAt = Times.now();
                User saved = users.saveAndFlush(user);
                storeCode(saved.id, code);
            });
        } catch (DataIntegrityViolationException e) {
            throw conflictFrom(e);
        }
        mail.send(email, code);
    }

    public AuthTokens verifyEmail(String rawEmail, String code) {
        String email = normalize(rawEmail);
        // 실패 횟수가 롤백되지 않도록 트랜잭션 안에서 예외를 던지지 않는다
        Optional<AuthTokens> result = tx.execute(s -> {
            User user = users.findByEmail(email).filter(u -> !u.isVerified()).orElse(null);
            if (user == null) {
                return Optional.<AuthTokens>empty();
            }
            EmailVerification verification = verifications.lockByUserId(user.id).orElse(null);
            if (verification == null
                    || verification.attempts >= MAX_CODE_ATTEMPTS
                    || verification.expiresAt.isBefore(Times.now())) {
                return Optional.<AuthTokens>empty();
            }
            verification.attempts++;
            if (!Hashes.constantTimeEquals(verification.codeHash, codeHash(user.id, code))) {
                return Optional.<AuthTokens>empty();
            }
            user.emailVerifiedAt = Times.now();
            verifications.delete(verification);
            return Optional.of(tokens.issue(user));
        });
        return result.orElseThrow(() -> new ApiException(ErrorCode.INVALID_VERIFICATION_CODE));
    }

    public void resendCode(String rawEmail) {
        String email = normalize(rawEmail);
        String code = newCode();
        boolean shouldSend = Boolean.TRUE.equals(tx.execute(s -> {
            User user = users.findByEmail(email).filter(u -> !u.isVerified()).orElse(null);
            if (user == null) {
                return false;
            }
            checkCooldown(user.id);
            storeCode(user.id, code);
            return true;
        }));
        if (shouldSend) {
            mail.send(email, code);
        }
    }

    public AuthTokens login(String rawEmail, String password) {
        String email = normalize(rawEmail);
        User user = users.findByEmail(email).orElse(null);
        String hash = user == null || user.passwordHash == null ? dummyHash : user.passwordHash;
        boolean matches = passwordEncoder.matches(password, hash);
        if (user == null || user.passwordHash == null || !matches) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (!user.isVerified()) {
            throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED);
        }
        return tx.execute(s -> tokens.issue(user));
    }

    public record GoogleLogin(AuthTokens tokens, boolean created) {}

    public GoogleLogin loginWithGoogle(String idToken) {
        GoogleUser googleUser = google.verify(idToken);
        return tx.execute(s -> {
            Optional<User> bySub = users.findByGoogleSub(googleUser.sub());
            if (bySub.isPresent()) {
                return new GoogleLogin(tokens.issue(bySub.get()), false);
            }
            Optional<User> byEmail = users.findByEmail(googleUser.email());
            if (byEmail.isPresent()) {
                return new GoogleLogin(tokens.issue(linkGoogle(byEmail.get(), googleUser.sub())), false);
            }
            User user = new User(googleUser.email(), newNickname());
            user.googleSub = googleUser.sub();
            user.emailVerifiedAt = Times.now();
            // 시작 화면의 "계속하면 개인정보처리방침에 동의" 안내에 따라 구글 첫 로그인을 동의로 본다
            user.privacyAgreedAt = Times.now();
            return new GoogleLogin(tokens.issue(users.saveAndFlush(user)), true);
        });
    }

    public AuthTokens refresh(String refreshToken) {
        return tx.execute(s -> {
            RefreshToken token = refreshTokens.lockByHash(Hashes.sha256Hex(refreshToken))
                    .filter(t -> t.revokedAt == null && t.expiresAt.isAfter(Times.now()))
                    .orElseThrow(() -> new ApiException(ErrorCode.INVALID_REFRESH_TOKEN));
            User user = users.findById(token.userId)
                    .orElseThrow(() -> new ApiException(ErrorCode.INVALID_REFRESH_TOKEN));
            token.revokedAt = Times.now();
            return tokens.issue(user);
        });
    }

    public void logout(String refreshToken) {
        tx.executeWithoutResult(s -> refreshTokens
                .lockByHash(Hashes.sha256Hex(refreshToken))
                .ifPresent(t -> t.revokedAt = Times.now()));
    }

    private User linkGoogle(User user, String sub) {
        if (!user.isVerified()) {
            // 메일 주인이 아닌 사람이 설정했을 수 있는 비밀번호는 지운다
            user.passwordHash = null;
            user.emailVerifiedAt = Times.now();
            verifications.findById(user.id).ifPresent(verifications::delete);
        }
        user.googleSub = sub;
        return user;
    }

    private void checkCooldown(Long userId) {
        verifications.lockByUserId(userId).ifPresent(v -> {
            LocalDateTime nextAllowed = v.lastSentAt.plus(RESEND_COOLDOWN);
            LocalDateTime now = Times.now();
            if (nextAllowed.isAfter(now)) {
                long seconds = Duration.between(now, nextAllowed).toSeconds() + 1;
                throw new ApiException(ErrorCode.TOO_MANY_REQUESTS, Map.of("retryAfterSeconds", seconds));
            }
        });
    }

    private void storeCode(Long userId, String code) {
        EmailVerification verification =
                verifications.findById(userId).orElseGet(() -> new EmailVerification(userId));
        LocalDateTime now = Times.now();
        verification.codeHash = codeHash(userId, code);
        verification.expiresAt = now.plus(CODE_TTL);
        verification.attempts = 0;
        verification.lastSentAt = now;
        verifications.save(verification);
    }

    private String codeHash(Long userId, String code) {
        return Hashes.hmacHex(props.emailCodeHmacSecret(), userId + ":" + code);
    }

    private String newCode() {
        return "%06d".formatted(random.nextInt(1_000_000));
    }

    /** 닉네임은 중복을 허용하므로 겹쳐도 다시 만들지 않는다. */
    private String newNickname() {
        return "여행자" + "%06d".formatted(random.nextInt(1_000_000));
    }

    private static String normalize(String email) {
        return email.strip().toLowerCase();
    }

    /** 이메일만 고유하므로 동시 가입 충돌은 이미 가입된 이메일로 본다. */
    private static ApiException conflictFrom(DataIntegrityViolationException e) {
        return new ApiException(ErrorCode.EMAIL_TAKEN);
    }
}

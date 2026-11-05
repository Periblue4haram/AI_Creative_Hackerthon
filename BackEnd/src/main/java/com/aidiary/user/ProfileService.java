package com.aidiary.user;

import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import com.aidiary.common.Times;
import com.aidiary.image.ImageCodec;
import com.aidiary.image.ImageStorage;
import com.aidiary.image.ImageUrls;
import com.aidiary.image.ImageUrls.UserImage;
import com.aidiary.image.PhotoProcessor;
import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

/** 마이페이지: 프로필, 프로필 사진, 얼굴 데이터. */
@Service
public class ProfileService {

    /** 프로필 사진은 화면에서 잘라 보내므로 서버는 크기만 줄인다. */
    private static final int PROFILE_MAX_EDGE = 512;
    private static final int FACE_MAX_EDGE = 1024;

    public enum LoginMethod {
        EMAIL,
        GOOGLE,
        EMAIL_AND_GOOGLE
    }

    public record MeResponse(
            Long id,
            String email,
            String nickname,
            String profileImageUrl,
            LoginMethod loginMethod,
            long diaryCount,
            LocalDate firstDiaryDate,
            OffsetDateTime privacyAgreedAt,
            OffsetDateTime createdAt) {}

    /** 얼굴 데이터가 없으면 registered는 false이고 나머지는 null이다. */
    public record FaceDataResponse(boolean registered, OffsetDateTime registeredAt, boolean enabled, String imageUrl) {}

    private final UserRepository users;
    private final ImageStorage storage;
    private final PhotoProcessor processor;
    private final ImageUrls urls;
    private final JdbcClient jdbc;
    private final TransactionTemplate tx;

    public ProfileService(
            UserRepository users,
            ImageStorage storage,
            PhotoProcessor processor,
            ImageUrls urls,
            JdbcClient jdbc,
            PlatformTransactionManager transactionManager) {
        this.users = users;
        this.storage = storage;
        this.processor = processor;
        this.urls = urls;
        this.jdbc = jdbc;
        this.tx = new TransactionTemplate(transactionManager);
    }

    public MeResponse me(Long userId) {
        User user = load(userId);
        long count = jdbc.sql("SELECT COUNT(*) FROM diaries WHERE user_id = :userId AND status = 'COMPLETED'")
                .param("userId", userId)
                .query(Long.class)
                .single();
        LocalDate first = jdbc.sql("SELECT MIN(logical_date) FROM diaries WHERE user_id = :userId AND status = 'COMPLETED'")
                .param("userId", userId)
                .query((rs, n) -> rs.getDate(1) == null ? null : rs.getDate(1).toLocalDate())
                .optional()
                .orElse(null);
        return new MeResponse(
                user.id,
                user.email,
                user.nickname,
                profileImageUrl(user),
                loginMethod(user),
                count,
                first,
                Times.offset(user.privacyAgreedAt),
                Times.offset(user.createdAt));
    }

    /** 닉네임은 다른 사람과 같아도 된다. */
    public MeResponse updateNickname(Long userId, String nickname) {
        String value = nickname.strip();
        if (value.length() < 2 || value.length() > 30) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        tx.executeWithoutResult(s -> load(userId).nickname = value);
        return me(userId);
    }

    public MeResponse setProfileImage(Long userId, MultipartFile file) {
        byte[] jpeg = ImageCodec.encodeJpeg(ImageCodec.fitWithin(
                ImageCodec.decode(processor.process(bytes(file)).jpeg()), PROFILE_MAX_EDGE));
        String path = storage.writeUserFile(userId, "profile", "jpg", jpeg);
        String old;
        try {
            old = tx.execute(s -> {
                User user = load(userId);
                String previous = user.profileImagePath;
                user.profileImagePath = path;
                user.profileImageVersion++;
                return previous;
            });
        } catch (RuntimeException e) {
            storage.deleteQuietly(path);
            throw e;
        }
        if (old != null) {
            storage.deleteQuietly(old);
        }
        return me(userId);
    }

    /** 기본 이미지로 되돌린다. */
    public MeResponse clearProfileImage(Long userId) {
        String old = tx.execute(s -> {
            User user = load(userId);
            String previous = user.profileImagePath;
            user.profileImagePath = null;
            user.profileImageVersion++;
            return previous;
        });
        if (old != null) {
            storage.deleteQuietly(old);
        }
        return me(userId);
    }

    public FaceDataResponse faceData(Long userId) {
        return toFaceData(load(userId));
    }

    /** 얼굴이 잘 보이는 사진 한 장을 등록한다. 다시 등록하면 바꾼다. */
    public FaceDataResponse registerFace(Long userId, MultipartFile file) {
        byte[] jpeg = ImageCodec.encodeJpeg(ImageCodec.fitWithin(
                ImageCodec.decode(processor.process(bytes(file)).jpeg()), FACE_MAX_EDGE));
        String path = storage.writeUserFile(userId, "face", "jpg", jpeg);
        String old;
        try {
            old = tx.execute(s -> {
                User user = load(userId);
                String previous = user.faceImagePath;
                user.faceImagePath = path;
                user.faceRegisteredAt = Times.now();
                user.faceEnabled = true;
                return previous;
            });
        } catch (RuntimeException e) {
            storage.deleteQuietly(path);
            throw e;
        }
        if (old != null) {
            storage.deleteQuietly(old);
        }
        return faceData(userId);
    }

    public FaceDataResponse setFaceEnabled(Long userId, boolean enabled) {
        tx.executeWithoutResult(s -> {
            User user = load(userId);
            if (user.faceImagePath == null) {
                throw new ApiException(ErrorCode.NOT_FOUND);
            }
            user.faceEnabled = enabled;
        });
        return faceData(userId);
    }

    /** 삭제해도 이미 저장한 일기의 그림은 그대로 남는다. */
    public void deleteFace(Long userId) {
        String old = tx.execute(s -> {
            User user = load(userId);
            String previous = user.faceImagePath;
            user.faceImagePath = null;
            user.faceRegisteredAt = null;
            user.faceEnabled = true;
            return previous;
        });
        if (old != null) {
            storage.deleteQuietly(old);
        }
    }

    public String profileImageUrl(User user) {
        return user.profileImagePath == null
                ? null
                : urls.signedUserImageUrl(UserImage.PROFILE, user.id, user.profileImageVersion);
    }

    private FaceDataResponse toFaceData(User user) {
        if (user.faceImagePath == null) {
            return new FaceDataResponse(false, null, false, null);
        }
        // 파일 경로는 등록할 때마다 새로 만들어지므로 URL 캐시를 구분하는 값으로 쓴다
        int version = user.faceImagePath.hashCode();
        return new FaceDataResponse(
                true,
                Times.offset(user.faceRegisteredAt),
                user.faceEnabled,
                urls.signedUserImageUrl(UserImage.FACE, user.id, version));
    }

    private static LoginMethod loginMethod(User user) {
        if (user.passwordHash != null && user.googleSub != null) {
            return LoginMethod.EMAIL_AND_GOOGLE;
        }
        return user.googleSub != null ? LoginMethod.GOOGLE : LoginMethod.EMAIL;
    }

    private static byte[] bytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }

    private User load(Long userId) {
        return users.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
    }
}

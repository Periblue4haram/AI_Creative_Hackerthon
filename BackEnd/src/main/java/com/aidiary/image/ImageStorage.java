package com.aidiary.image;

import com.aidiary.config.AppProperties;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** 이미지 파일 저장소. DB에는 이 저장소 루트 기준의 상대 경로만 저장한다. */
@Component
public class ImageStorage {

    private static final Logger log = LoggerFactory.getLogger(ImageStorage.class);

    private final Path root;

    public ImageStorage(AppProperties props) {
        this.root = Path.of(props.imageStorageRoot()).toAbsolutePath().normalize();
    }

    /** 저장한 파일의 상대 경로를 돌려준다. 파일 이름은 사용자 입력을 쓰지 않는다. */
    public String write(long diaryId, long pageId, String extension, byte[] bytes) {
        return writeRelative(diaryId + "/" + pageId + "/" + UUID.randomUUID() + "." + extension, bytes);
    }

    /** 프로필 사진과 얼굴 데이터처럼 일기와 무관한 사용자 파일. users/{userId}/{folder}/ 아래에 둔다. */
    public String writeUserFile(long userId, String folder, String extension, byte[] bytes) {
        return writeRelative("users/" + userId + "/" + folder + "/" + UUID.randomUUID() + "." + extension, bytes);
    }

    private String writeRelative(String relative, byte[] bytes) {
        Path target = resolve(relative);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, bytes);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return relative;
    }

    public byte[] read(String relative) {
        try {
            return Files.readAllBytes(resolve(relative));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** 실패해도 로그만 남긴다. DB 행이 없어 남은 파일에는 접근할 수 없다. */
    public void deleteQuietly(String relative) {
        try {
            Files.deleteIfExists(resolve(relative));
        } catch (IOException | RuntimeException e) {
            log.warn("이미지 파일 삭제 실패: {}", relative);
        }
    }

    private Path resolve(String relative) {
        Path path = root.resolve(relative).normalize();
        if (!path.startsWith(root)) {
            throw new IllegalArgumentException("저장소 밖의 경로입니다");
        }
        return path;
    }
}

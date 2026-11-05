package com.aidiary.image;

import java.time.LocalDateTime;

/** EXIF를 지운 JPEG와, 파일에서 읽어 낸 촬영 시각과 좌표. 좌표는 지역 판정 후 버린다. */
public record ProcessedPhoto(byte[] jpeg, LocalDateTime takenAt, Double latitude, Double longitude) {

    public boolean hasLocation() {
        return latitude != null && longitude != null;
    }
}

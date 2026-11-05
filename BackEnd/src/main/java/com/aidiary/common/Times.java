package com.aidiary.common;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;

/** 서비스의 모든 시각은 한국 시간 기준이다. */
public final class Times {

    public static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final ZoneOffset KST_OFFSET = ZoneOffset.ofHours(9);
    private static final int DAY_START_HOUR = 5;

    private Times() {}

    public static LocalDateTime now() {
        return LocalDateTime.now(KST);
    }

    public static OffsetDateTime offset(LocalDateTime time) {
        return time == null ? null : time.atOffset(KST_OFFSET);
    }

    /** 오전 5시부터 다음 날 오전 5시 전까지를 하루로 본다. */
    public static LocalDate logicalDate(LocalDateTime takenAt) {
        return takenAt.minusHours(DAY_START_HOUR).toLocalDate();
    }
}

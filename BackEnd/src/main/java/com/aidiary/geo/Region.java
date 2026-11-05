package com.aidiary.geo;

import java.util.Arrays;
import java.util.Optional;

public enum Region {
    MAPO("마포구"),
    JONGNO("종로구"),
    JUNG("중구"),
    GANGNAM("강남구"),
    SEODAEMUN("서대문구");

    private static final String SEOUL = "서울특별시";

    public final String districtName;

    Region(String districtName) {
        this.districtName = districtName;
    }

    /** 사용자가 입력한 구 이름. 공백만 제거하고 정확히 일치해야 한다. */
    public static Optional<Region> fromDistrict(String input) {
        String name = input == null ? "" : input.strip();
        return Arrays.stream(values()).filter(r -> r.districtName.equals(name)).findFirst();
    }

    /** 부산 중구 같은 동명 지역을 막기 위해 시/도까지 확인한다. */
    public static Optional<Region> fromAddress(String area1, String area2) {
        return SEOUL.equals(area1) ? fromDistrict(area2) : Optional.empty();
    }
}

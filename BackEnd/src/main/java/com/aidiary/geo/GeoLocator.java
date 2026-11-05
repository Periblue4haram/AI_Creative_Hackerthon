package com.aidiary.geo;

public interface GeoLocator {

    GeoResult locate(double latitude, double longitude);

    /** 위치 판정 결과. region은 SUPPORTED일 때만 값이 있다. */
    record GeoResult(Status status, Region region) {
        public enum Status {
            SUPPORTED,
            OUTSIDE,
            UNAVAILABLE
        }

        public static GeoResult supported(Region region) {
            return new GeoResult(Status.SUPPORTED, region);
        }

        public static GeoResult outside() {
            return new GeoResult(Status.OUTSIDE, null);
        }

        public static GeoResult unavailable() {
            return new GeoResult(Status.UNAVAILABLE, null);
        }
    }
}

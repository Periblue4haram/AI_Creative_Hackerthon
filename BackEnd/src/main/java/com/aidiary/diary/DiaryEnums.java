package com.aidiary.diary;

public final class DiaryEnums {

    private DiaryEnums() {}

    public enum DiaryStatus {
        METADATA_PENDING,
        CREATING,
        COMPLETED
    }

    public enum DiaryVisibility {
        PRIVATE,
        PUBLIC
    }

    public enum PageVisibility {
        PRIVATE,
        PHOTO_HIDDEN,
        PUBLIC
    }

    public enum DateSource {
        EXIF,
        USER_INPUT
    }

    public enum LocationSource {
        EXIF,
        USER_INPUT,
        UNKNOWN
    }

    public enum ImageStatus {
        PENDING,
        PROCESSING,
        DONE,
        FAILED
    }

    public enum ImageSource {
        CONVERTED,
        ORIGINAL
    }

    public enum ChatStatus {
        NOT_STARTED,
        IN_PROGRESS,
        COMPLETED
    }

    public enum MessageRole {
        ASSISTANT,
        USER
    }

    public enum MetadataIssue {
        DATE_REQUIRED,
        LOCATION_REQUIRED,
        DATE_MISMATCH
    }
}

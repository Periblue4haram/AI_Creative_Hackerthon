package com.aidiary.common;

import java.util.Map;

public class ApiException extends RuntimeException {

    public final ErrorCode code;
    public final Map<String, Object> details;

    public ApiException(ErrorCode code) {
        this(code, null);
    }

    public ApiException(ErrorCode code, Map<String, Object> details) {
        super(code.message);
        this.code = code;
        this.details = details;
    }
}

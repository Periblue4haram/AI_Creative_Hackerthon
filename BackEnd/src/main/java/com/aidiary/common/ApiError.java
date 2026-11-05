package com.aidiary.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(String code, String message, Map<String, Object> details) {

    public static ApiError of(ErrorCode code, Map<String, Object> details) {
        return new ApiError(code.name(), code.message, details);
    }
}

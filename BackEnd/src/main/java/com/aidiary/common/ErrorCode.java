package com.aidiary.common;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "요청 값이 올바르지 않습니다."),
    INVALID_VERIFICATION_CODE(HttpStatus.BAD_REQUEST, "인증 코드가 올바르지 않거나 만료되었습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
    INVALID_GOOGLE_TOKEN(HttpStatus.UNAUTHORIZED, "구글 인증에 실패했습니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요."),
    EMAIL_NOT_VERIFIED(HttpStatus.FORBIDDEN, "이메일 인증이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "권한이 없습니다."),
    CANNOT_REPORT_OWN_PAGE(HttpStatus.FORBIDDEN, "자신의 페이지는 신고할 수 없습니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "대상을 찾을 수 없습니다."),
    EMAIL_TAKEN(HttpStatus.CONFLICT, "이미 가입된 이메일입니다."),
    PAGE_LIMIT_EXCEEDED(HttpStatus.CONFLICT, "일기 한 편에는 사진을 4장까지 넣을 수 있습니다."),
    LAST_PAGE_CANNOT_BE_DELETED(HttpStatus.CONFLICT, "마지막 페이지는 삭제할 수 없습니다."),
    INVALID_STATE(HttpStatus.CONFLICT, "현재 상태에서는 할 수 없는 요청입니다."),
    CHAT_LIMIT_REACHED(HttpStatus.CONFLICT, "일기 분량이 800자에 도달했습니다."),
    ALREADY_REPORTED(HttpStatus.CONFLICT, "이미 신고한 페이지입니다."),
    PAGE_REPORT_BLOCKED(HttpStatus.CONFLICT, "신고로 차단된 페이지는 공개할 수 없습니다."),
    FILE_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "사진은 장당 10MB까지 올릴 수 있습니다."),
    UNSUPPORTED_IMAGE_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "JPEG, PNG, WebP 사진만 올릴 수 있습니다."),
    METADATA_INCOMPLETE(HttpStatus.UNPROCESSABLE_ENTITY, "날짜나 위치 입력이 필요한 사진이 있습니다."),
    DATE_MISMATCH(HttpStatus.UNPROCESSABLE_ENTITY, "다른 날짜의 사진이 있습니다."),
    REGION_NOT_SUPPORTED(HttpStatus.UNPROCESSABLE_ENTITY, "5개의 구 외에는 아직 불가능합니다"),
    PAGE_NOT_SHAREABLE(HttpStatus.UNPROCESSABLE_ENTITY, "위치를 모르는 페이지는 공유할 수 없습니다."),
    DIARY_INCOMPLETE(HttpStatus.UNPROCESSABLE_ENTITY, "이미지나 글이 없는 페이지가 있습니다."),
    NO_USER_MESSAGE(HttpStatus.UNPROCESSABLE_ENTITY, "질문에 답변한 뒤 일기를 만들 수 있습니다."),
    TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해 주세요."),
    AI_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "AI 응답을 받지 못했습니다. 다시 시도해 주세요."),
    SEARCH_AI_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "지금은 검색할 수 없어요. 잠시 뒤 다시 찾아보세요."),
    EMAIL_SEND_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "인증 메일을 보내지 못했습니다. 다시 시도해 주세요."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다.");

    public final HttpStatus status;
    public final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }
}

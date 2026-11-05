package com.aidiary.ai;

/** 사진을 애니메이션 그림체로 바꾸는 경계. 실패하면 AiUnavailableException을 던진다. */
public interface ImageStyler {

    record GeneratedImage(byte[] bytes, String contentType) {}

    GeneratedImage toAnimeStyle(byte[] jpegPhoto);
}

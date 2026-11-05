package com.aidiary.ai;

/** 사진을 애니메이션 그림체로 바꾸는 경계. 실패하면 AiUnavailableException을 던진다. */
public interface ImageStyler {

    record GeneratedImage(byte[] bytes, String contentType) {}

    /** faceReference가 있으면 사진 속 주인공을 그 얼굴과 닮게 그린다. 없으면 null. */
    GeneratedImage toAnimeStyle(byte[] jpegPhoto, byte[] faceReference);
}

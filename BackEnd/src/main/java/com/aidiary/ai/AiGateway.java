package com.aidiary.ai;

import java.util.List;

/** 대화, 일기 글, 임베딩을 담당하는 AI 경계. 실패하면 AiUnavailableException을 던진다. 그림체 변환은 ImageStyler가 맡는다. */
public interface AiGateway {

    record Turn(boolean fromUser, String content) {}

    record ChatReply(String question, int estimatedChars) {}

    /** 사진을 분석해 어떤 행동을 했는지 유추하는 첫 질문을 만든다. */
    String firstQuestion(byte[] photo, String context);

    /** 지금까지의 대화를 보고 이 사진에 대한 다음 질문과 예상 일기 분량을 돌려준다. */
    ChatReply nextQuestion(byte[] photo, String context, List<Turn> history);

    String writeDiary(byte[] photo, String context, List<Turn> history);

    float[] embedDocument(String text);

    float[] embedQuery(String text);
}

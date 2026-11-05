package com.aidiary.diary;

import com.aidiary.ai.AiGateway;
import com.aidiary.ai.AiGateway.ChatReply;
import com.aidiary.ai.AiGateway.Turn;
import com.aidiary.ai.AiUnavailableException;
import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import com.aidiary.common.Times;
import com.aidiary.diary.DiaryAccess.PageAndDiary;
import com.aidiary.diary.DiaryDtos.ChatHistoryResponse;
import com.aidiary.diary.DiaryDtos.ChatMessageDto;
import com.aidiary.diary.DiaryDtos.ChatTurnResponse;
import com.aidiary.diary.DiaryDtos.OwnerPage;
import com.aidiary.diary.DiaryEnums.ChatStatus;
import com.aidiary.diary.DiaryEnums.DiaryStatus;
import com.aidiary.diary.DiaryEnums.MessageRole;
import com.aidiary.image.ImageStorage;
import com.aidiary.image.PageImage.Kind;
import com.aidiary.image.PageImageRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** 페이지별 챗봇 대화와 일기 글 생성. AI 호출은 트랜잭션 밖에서 한다. */
@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    private static final int FINISH_SUGGEST_CHARS = 500;
    private static final int LIMIT_CHARS = 800;

    private final DiaryPageRepository pages;
    private final ChatMessageRepository messages;
    private final PageImageRepository images;
    private final ImageStorage storage;
    private final AiGateway ai;
    private final DiaryAccess access;
    private final DiaryMapper mapper;
    private final TransactionTemplate tx;

    public ChatService(
            DiaryPageRepository pages,
            ChatMessageRepository messages,
            PageImageRepository images,
            ImageStorage storage,
            AiGateway ai,
            DiaryAccess access,
            DiaryMapper mapper,
            PlatformTransactionManager transactionManager) {
        this.pages = pages;
        this.messages = messages;
        this.images = images;
        this.storage = storage;
        this.ai = ai;
        this.access = access;
        this.mapper = mapper;
        this.tx = new TransactionTemplate(transactionManager);
    }

    public ChatTurnResponse start(Long userId, Long pageId) {
        PageAndDiary target = chatTarget(userId, pageId);
        List<ChatMessage> existing = messages.findByPageIdOrderByIdAsc(pageId);
        if (!existing.isEmpty()) {
            return turnResponse(existing.getFirst(), target.page());
        }
        String question = callAi(() -> ai.firstQuestion(photo(pageId), context(target)));
        return tx.execute(s -> {
            DiaryPage page = lockPage(pageId);
            // 같은 시작 요청이 동시에 들어와도 첫 질문은 하나만 남긴다
            List<ChatMessage> again = messages.findByPageIdOrderByIdAsc(pageId);
            if (!again.isEmpty()) {
                return turnResponse(again.getFirst(), page);
            }
            ChatMessage saved = messages.save(new ChatMessage(pageId, MessageRole.ASSISTANT, question));
            page.chatStatus = ChatStatus.IN_PROGRESS;
            return turnResponse(saved, page);
        });
    }

    public ChatHistoryResponse history(Long userId, Long pageId) {
        DiaryPage page = access.readablePage(userId, pageId).page();
        List<ChatMessageDto> items =
                messages.findByPageIdOrderByIdAsc(pageId).stream().map(ChatService::toDto).toList();
        return new ChatHistoryResponse(
                items,
                page.chatStatus,
                page.estimatedChars,
                page.estimatedChars >= FINISH_SUGGEST_CHARS,
                page.estimatedChars >= LIMIT_CHARS);
    }

    public ChatTurnResponse send(Long userId, Long pageId, String content) {
        PageAndDiary target = chatTarget(userId, pageId);
        DiaryPage page = target.page();
        if (page.chatStatus != ChatStatus.IN_PROGRESS) {
            throw new ApiException(ErrorCode.INVALID_STATE);
        }
        if (page.estimatedChars >= LIMIT_CHARS) {
            throw new ApiException(ErrorCode.CHAT_LIMIT_REACHED);
        }
        // AI 호출이 실패하면 사용자가 같은 답변을 다시 보낼 수 있도록, 성공한 뒤에만 함께 저장한다
        List<Turn> history = turns(pageId);
        history.add(new Turn(true, content));
        ChatReply reply = callAi(() -> ai.nextQuestion(photo(pageId), context(target), history));
        return tx.execute(s -> {
            DiaryPage locked = lockPage(pageId);
            if (locked.chatStatus != ChatStatus.IN_PROGRESS) {
                throw new ApiException(ErrorCode.INVALID_STATE);
            }
            messages.save(new ChatMessage(pageId, MessageRole.USER, content));
            ChatMessage saved = messages.save(new ChatMessage(pageId, MessageRole.ASSISTANT, reply.question()));
            // 일기 분량 추정치는 대화가 이어지는 동안 줄어들지 않는다
            locked.estimatedChars = Math.min(LIMIT_CHARS, Math.max(locked.estimatedChars, reply.estimatedChars()));
            return turnResponse(saved, locked);
        });
    }

    public OwnerPage generateText(Long userId, Long pageId) {
        PageAndDiary target = chatTarget(userId, pageId);
        List<Turn> history = turns(pageId);
        if (history.stream().noneMatch(Turn::fromUser)) {
            throw new ApiException(ErrorCode.NO_USER_MESSAGE);
        }
        String text = limit(callAi(() -> ai.writeDiary(photo(pageId), context(target), history)));
        tx.executeWithoutResult(s -> {
            DiaryPage page = lockPage(pageId);
            page.content = text;
            page.chatStatus = ChatStatus.COMPLETED;
        });
        return mapper.toOwnerPage(pages.findById(pageId).orElseThrow(), target.diary());
    }

    private PageAndDiary chatTarget(Long userId, Long pageId) {
        PageAndDiary target = access.readablePage(userId, pageId);
        if (target.diary().status != DiaryStatus.CREATING
                || !target.page().isMetadataComplete()
                || !Objects.equals(target.diary().logicalDate, target.page().logicalDate)) {
            throw new ApiException(ErrorCode.INVALID_STATE);
        }
        return target;
    }

    private DiaryPage lockPage(Long pageId) {
        return pages.lockById(pageId).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    private byte[] photo(Long pageId) {
        return images.findByPageIdAndKind(pageId, Kind.ORIGINAL)
                .map(i -> storage.read(i.storagePath))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    private static String context(PageAndDiary target) {
        DiaryPage page = target.page();
        String place = page.region == null ? "알 수 없음" : "서울 " + page.region.districtName;
        String time = page.takenAt == null ? "" : ", 촬영 시각: " + page.takenAt.toLocalTime();
        return "사진 정보 - 날짜: " + target.diary().logicalDate + time + ", 장소: " + place;
    }

    private List<Turn> turns(Long pageId) {
        List<Turn> turns = new ArrayList<>();
        for (ChatMessage message : messages.findByPageIdOrderByIdAsc(pageId)) {
            turns.add(new Turn(message.role == MessageRole.USER, message.content));
        }
        return turns;
    }

    /** 마지노선을 넘으면 800자 안의 마지막 문장까지만 남긴다. */
    private static String limit(String text) {
        if (text.length() <= LIMIT_CHARS) {
            return text;
        }
        String cut = text.substring(0, LIMIT_CHARS);
        int end = Math.max(cut.lastIndexOf('.'), Math.max(cut.lastIndexOf('!'), cut.lastIndexOf('?')));
        return end > 0 ? cut.substring(0, end + 1) : cut;
    }

    private static <T> T callAi(java.util.function.Supplier<T> call) {
        try {
            return call.get();
        } catch (AiUnavailableException e) {
            log.warn("AI 호출 실패: {}", e.getMessage());
            throw new ApiException(ErrorCode.AI_UNAVAILABLE);
        }
    }

    private static ChatTurnResponse turnResponse(ChatMessage message, DiaryPage page) {
        return new ChatTurnResponse(
                toDto(message),
                page.chatStatus,
                page.estimatedChars,
                page.estimatedChars >= FINISH_SUGGEST_CHARS,
                page.estimatedChars >= LIMIT_CHARS);
    }

    private static ChatMessageDto toDto(ChatMessage message) {
        return new ChatMessageDto(message.id, message.role, message.content, Times.offset(message.createdAt));
    }
}

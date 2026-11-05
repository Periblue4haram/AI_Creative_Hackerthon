import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NoticeSheet from '../components/NoticeSheet.jsx';
import assets from '../assetMap.js';
import { AppBar, Button, Chip, PaperGrain, Polaroid, Progress, StatusBar } from '../components/common.jsx';
import { CHAT_QUESTIONS, CHAT_TOTAL } from '../data/mock.js';
import DesktopNav from '../components/DesktopNav.jsx';
import useDesktop from '../hooks/useDesktop.js';

const PINNED = ['sceneSeongsu', 'sceneHanRiver', 'sceneGyeongbok', 'sceneSeongsu'];
// 800자에 도달하면 입력을 막는다 (README: 글 상한 800자)
const MAX_CHARS = 800;

/** 07 챗봇 대화: 사진마다 짧게 묻고 답한다. 언제든 "일기 만들기"로 넘어갈 수 있다. */
export default function NewChat() {
  const navigate = useNavigate();
  const wide = useDesktop();
  // 예외 상태 미리보기: /new/chat?e=7 (답을 받지 못했어요)
  const [params] = useSearchParams();
  const [failed, setFailed] = useState(params.get('e') === '7');
  const [step, setStep] = useState(1); // 현재 질문 번호 (1부터)
  const [messages, setMessages] = useState([{ from: 'bot', text: CHAT_QUESTIONS[0].text }]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  const answered = messages.filter((m) => m.from === 'me').length;
  const used = messages.filter((m) => m.from === 'me').reduce((n, m) => n + m.text.length, 0);
  const done = step >= CHAT_TOTAL && answered >= CHAT_TOTAL;
  const left = Math.max(CHAT_TOTAL - step, 0);
  const current = CHAT_QUESTIONS[step - 1];
  const showQuick = !typing && !done && current?.quick && messages[messages.length - 1]?.from === 'bot';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, typing]);

  const send = (text) => {
    const t = text.trim();
    if (!t || typing || done || used + t.length > MAX_CHARS) return;
    setMessages((m) => [...m, { from: 'me', text: t }]);
    setDraft('');
    if (step >= CHAT_TOTAL) return;
    setTyping(true);
    window.setTimeout(() => {
      setMessages((m) => [...m, { from: 'bot', text: CHAT_QUESTIONS[step].text }]);
      setStep((s) => s + 1);
      setTyping(false);
    }, 600);
  };

  const failSheet = failed && (
    <NoticeSheet
      icon="chat"
      tape="rose"
      title="답을 받지 못했어요"
      body="쓰던 대화는 그대로 남아 있어요."
      actions={[{ label: '다시 시도', onClick: () => setFailed(false) }]}
      onClose={() => setFailed(false)}
    />
  );

  const makeBtn = (
    <Button className="chat-make" small icon={assets.iconSparkle} disabled={answered < 1} onClick={() => navigate('/new/style')}>
      일기 만들기
    </Button>
  );

  const chatBody = (
    <>
      <div className="chat-scroll">
        <div className="chat-messages" role="log" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`bubble-row bubble-row--${m.from}`}>
              {m.from === 'bot' && (
                <span className="bubble-avatar">
                  <img src={assets.iconEdit} alt="" />
                </span>
              )}
              <p className={`bubble bubble--${m.from} t-body`}>{m.text}</p>
            </div>
          ))}
          {typing && (
            <div className="bubble-row bubble-row--bot" aria-label="답변을 쓰는 중">
              <span className="bubble-avatar">
                <img src={assets.iconEdit} alt="" />
              </span>
              <p className="bubble bubble--bot t-body">…</p>
            </div>
          )}
          {showQuick && (
            <div className="quick">
              {current.quick.map((q) => (
                <Chip key={q} onClick={() => send(q)}>
                  {q}
                </Chip>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <p className="chat-hint t-hand-small">
        {done ? '질문이 모두 끝났어요. 일기를 만들어 볼까요?' : `남은 질문은 ${left}개예요. 언제든 일기를 만들 수 있어요.`}
      </p>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <input
          type="text"
          value={draft}
          placeholder="답변을 입력하세요"
          aria-label="답변 입력"
          disabled={done || used >= MAX_CHARS}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className="chat-input__send" aria-label="보내기" disabled={!draft.trim() || typing || done}>
          <img src={assets.iconSend} alt="" />
        </button>
      </form>
    </>
  );

  if (wide) {
    return (
      <div className="screen screen--cream dsk-screen">
        <PaperGrain />
        <DesktopNav active="desk" />
        <div className="chat-d">
          <aside className="chat-d__side">
            <h2 className="t-heading">오늘 이야기</h2>
            <p className="t-caption">
              질문 {Math.min(step, CHAT_TOTAL)} / {CHAT_TOTAL}
            </p>
            <div className="chat-d__grid">
              {PINNED.map((scene, i) => (
                <Polaroid key={i} src={assets[scene]} caption={['11:20', '13:05', '15:42', '16:10'][i]} scale={0.62} />
              ))}
            </div>
            <span className="pinned__place t-caption-strong">
              <img src={assets.iconPinSmall} alt="" />
              성동구 · 성수동
            </span>
          </aside>
          <section className="chat-d__main">
            <div className="chat-d__top">{makeBtn}</div>
            {chatBody}
          </section>
        </div>
        {failSheet}
      </div>
    );
  }

  return (
    <div className="screen screen--cream">
      <PaperGrain />
      <StatusBar />
      <AppBar title="오늘 이야기">{makeBtn}</AppBar>
      <Progress step={3} />

      <div className="pinned" aria-label="오늘의 사진">
        {PINNED.map((scene, i) => (
          <Polaroid key={i} src={assets[scene]} scale={0.36} style={{ marginTop: -16.12, flex: 'none' }} />
        ))}
        <div className="pinned__info">
          <span className="pinned__place t-caption-strong">
            <img src={assets.iconPinSmall} alt="" />
            성동구 · 성수동
          </span>
          <span className="t-date">
            질문 {Math.min(step, CHAT_TOTAL)} / {CHAT_TOTAL}
          </span>
        </div>
      </div>

      {chatBody}
      {failSheet}
    </div>
  );
}

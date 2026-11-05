import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import assets from '../../assetMap.js';
import { Button, Tape } from '../../components/common.jsx';
import useDesktop from '../../hooks/useDesktop.js';
import { CHAT_FIRST, CHAT_HINT, CHAT_MAX, CHAT_NEXT, TEXT_MAX, VIS, longDay, shortDay } from '../data.js';
import { useApp } from '../store.jsx';
import { ErrorCard, Page, PhotoImg, Pager, Sheet, Spinner, Toast, Toggle, VisSeg, useFilePicker, usePreview } from '../ui.jsx';
import { useDemoLoader } from './Create1.jsx';

const guOf = (p) => (p.gu === 'unknown' ? '위치 모름' : p.gu);
const READY_KINDS = ['ok', 'regenfail', 'edit', 'publish'];

/* ─────────── C5 · 페이지 현황 ─────────── */
export function CreateTalk() {
  const nav = useNavigate();
  const { draft } = useApp();
  const s = useDemoLoader(['talk', 'fail']);
  const [sheet, setSheet] = useState(null); // 변환 실패 선택 시트 (사진 id)
  const [card, setCard] = useState(null);
  const [rid, setRid] = useState(null);
  const shown = useRef(false);
  const photos = draft.photos;

  useEffect(() => {
    draft.convertWaiting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length]);
  useEffect(() => {
    const f = photos.find((p) => p.conv === 'fail');
    if (s === 'fail' && f && !shown.current) {
      shown.current = true;
      setSheet(f.id);
    }
  }, [photos, s]);

  const [pick, input] = useFilePicker((fs) => {
    draft.replace(rid, { url: URL.createObjectURL(fs[0]), name: fs[0].name, at: new Date(fs[0].lastModified), gu: null });
    setSheet(null);
    nav('/create/info');
  }, false);

  if (photos.length === 0 && !s) return <Navigate to="/create" replace />;
  const talkBadge = (p) => (p.talk === 'done' ? ['대화 완료', 'ok'] : p.chat.length > 1 ? ['대화 중', 'on'] : ['대화 전', '']);
  const convBadge = (p) =>
    ({ wait: ['그림 변환 중', ''], run: ['그림 변환 중', ''], done: ['그림 완료', 'ok'], orig: ['원본 사용', 'ok'], fail: ['변환 실패', 'bad'] })[p.conv];
  const go = (p, i) => (p.conv === 'fail' ? setSheet(p.id) : nav(`/create/talk/${i + 1}`));
  const sp = photos.find((p) => p.id === sheet);

  return (
    <Page
      title="페이지별 이야기"
      dtitle="새 일기"
      step={3}
      onBack={() => nav('/create/info')}
      foot={
        <>
          <p className="t-caption v3-muted v3-center">모든 페이지의 글과 그림이 준비되면 미리보기로 넘어가요</p>
          <Button block variant={draft.ready() ? 'primary' : 'secondary'} onClick={() => (draft.ready() ? nav('/create/preview') : setCard('DIARY_INCOMPLETE'))}>
            미리보기
          </Button>
        </>
      }
      side={
        <>
          <h2 className="t-heading">사진마다 이야기를<br />들려주세요</h2>
          <p className="t-caption">그림 변환은 뒤에서 진행돼요. 기다리지 않아도 돼요.</p>
        </>
      }
      overlay={
        <>
          {card && <ErrorCard code={card} onClose={() => setCard(null)} />}
          {sp && (
            <Sheet onClose={() => setSheet(null)}>
              <div className="v3-prow v3-prow--flat">
                <span className="v3-prow__th v3-prow__th--lg"><PhotoImg p={sp} raw /></span>
                <span className="v3-prow__t"><b className="t-heading">페이지 {photos.indexOf(sp) + 1} 변환에 실패했어요</b><span className="t-caption">다시 시도해도 그림으로 바꾸지 못했어요.</span></span>
              </div>
              <div className="v3-stack">
                <Button block icon={assets.iconRefresh} onClick={() => { draft.convert(sp.id); setSheet(null); }}>다시 시도</Button>
                <Button block variant="secondary" onClick={() => { draft.set(sp.id, { conv: 'orig' }); setSheet(null); }}>원본 사용</Button>
                <p className="t-caption v3-muted v3-center">원본을 쓴 페이지를 공개하면 원본 사진이 보여요</p>
                <Button block variant="ghost" icon={assets.iconCamera} onClick={() => { setRid(sp.id); setTimeout(pick, 0); }}>사진 교체</Button>
                <p className="t-caption v3-muted v3-center">교체하면 이 페이지의 대화와 글이 초기화돼요</p>
              </div>
            </Sheet>
          )}
        </>
      }
    >
      {input}
      <h2 className="v3-h2 v3-mobile-only">사진마다 이야기를<br />들려주세요</h2>
      <p className="t-caption v3-lead v3-mobile-only">그림 변환은 뒤에서 진행돼요. 기다리지 않아도 돼요.</p>
      <ul className="v3-plist v3-plist--go">
        {photos.map((p, i) => {
          const [tl, tk] = talkBadge(p);
          const [cl, ck] = convBadge(p);
          return (
            <li key={p.id}>
              <button type="button" className="v3-prow" onClick={() => go(p, i)}>
                <span className="v3-prow__th v3-prow__th--lg"><PhotoImg p={p} raw /></span>
                <span className="v3-prow__t">
                  <b className="t-body-strong">페이지 {i + 1}</b>
                  <span className="v3-badges">
                    <i className={`v3-badge ${tk && `v3-badge--${tk}`}`}>{tl}</i>
                    <i className={`v3-badge ${ck && `v3-badge--${ck}`}`}>{cl}</i>
                  </span>
                </span>
                <img src={assets.iconChevronRight} alt="" />
              </button>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}

/* ─────────── C6 · 페이지별 대화 ─────────── */
const FILL = '카페 창가에 앉아 오래 읽고 쉬었다. 따뜻한 라테와 햇살이 좋아서 시간 가는 줄 몰랐다. ';
const demoChat = (target) => {
  const msgs = [{ r: 'ai', t: '카페에서 책을 읽으신 것 같아요. 어떤 책이었나요?' }, { r: 'me', t: '소설을 읽었는데 분위기가 정말 좋았어요.' }, { r: 'ai', t: '창가 자리의 햇살이 인상적이네요. 그때 기분은 어땠나요?' }];
  const base = msgs[1].t.length;
  let mine = '오랜만에 여유로웠어요. 라테도 따뜻했고요.';
  while (base + mine.length < target) mine += ` ${FILL}`;
  return [...msgs, { r: 'me', t: mine.slice(0, Math.max(0, target - base)) }];
};
export const userChars = (chat) => chat.filter((m) => m.r === 'me').reduce((n, m) => n + m.t.length, 0);

export function CreateChat() {
  const nav = useNavigate();
  const desk = useDesktop();
  const { n } = useParams();
  const { draft } = useApp();
  const s = useDemoLoader(['chat', '500', '800', 'aifail']);
  const i = Number(n) - 1;
  const p = draft.photos[i];
  const [text, setText] = useState('');
  const [card, setCard] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (p && p.chat.length === 0) draft.set(p.id, { chat: s === '500' ? demoChat(510) : s === '800' ? demoChat(800) : s === 'chat' ? demoChat(120) : [{ r: 'ai', t: CHAT_FIRST }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id]);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [p?.chat.length, busy]);

  if (!p) return draft.photos.length === 0 && !s ? <Navigate to="/create" replace /> : null;
  const chars = userChars(p.chat);
  const full = chars >= CHAT_MAX;
  const hint = chars >= CHAT_HINT && !full;
  const convLabel = { wait: '그림 변환 중', run: '그림 변환 중', done: '그림 완료', orig: '원본 사용', fail: '변환 실패' }[p.conv];

  const send = () => {
    const t = text.trim();
    if (!t || busy || full) return;
    if (s === 'aifail') return setCard('AI_UNAVAILABLE');
    const room = CHAT_MAX - chars;
    const mine = t.slice(0, room);
    const chat = [...p.chat, { r: 'me', t: mine }];
    draft.set(p.id, { chat, talk: 'ing' });
    setText('');
    if (chars + mine.length >= CHAT_MAX) return;
    setBusy(true);
    setTimeout(() => {
      draft.set(p.id, (x) => ({ chat: [...x.chat, { r: 'ai', t: CHAT_NEXT[(userChars(x.chat) + x.chat.length) % CHAT_NEXT.length] }] }));
      setBusy(false);
    }, 900);
  };
  const make = () => {
    if (chars === 0) return setCard('NO_USER_MESSAGE');
    draft.writeText(p.id);
    nav(`/create/writing/${n}`);
  };
  const pct = Math.min(100, (chars / CHAT_MAX) * 100);
  const bar = (
    <div className="v3-meter">
      <div className="v3-meter__top"><span className="t-caption">일기 분량 {chars}자</span><span className="t-caption v3-muted">{convLabel}</span></div>
      <div className="v3-meter__bar"><i style={{ width: `${pct}%` }} /><u style={{ left: `${(CHAT_HINT / CHAT_MAX) * 100}%` }} /></div>
    </div>
  );
  const genBtn = (
    <button type="button" className="v3-gen" onClick={make}><img src={assets.iconSparkle} alt="" />일기 글 만들기</button>
  );

  return (
    <Page
      title={`페이지 ${n} / ${draft.photos.length}`}
      dtitle="새 일기"
      back="back"
      onBack={() => nav('/create/talk')}
      right={full ? null : genBtn}
      step={3}
      side={
        <>
          <h2 className="t-heading">페이지 {n} / {draft.photos.length}</h2>
          <div style={{ alignSelf: 'center', transform: 'rotate(-2deg)' }}>
            <div className="polaroid" style={{ '--s': 1.5 }}><div className="polaroid__photo"><PhotoImg p={p} raw /></div><p className="polaroid__caption">{guOf(p) || ''}</p></div>
          </div>
          {bar}
          <div className="v3-thumbs">
            {draft.photos.map((x, k) => (
              <button key={x.id} type="button" className={k === i ? 'on' : ''} onClick={() => nav(`/create/talk/${k + 1}`)} aria-label={`페이지 ${k + 1}`}><PhotoImg p={x} raw /></button>
            ))}
          </div>
        </>
      }
      overlay={card && <ErrorCard code={card} onClose={() => setCard(null)} onAction={[() => { setCard(null); inputRef.current?.focus(); }]} />}
      foot={
        <>
          {full && (
            <div className="v3-card v3-card--note">
              <b className="t-body-strong">일기 분량을 다 채웠어요</b>
              <p className="t-caption">이제 대화 내용으로 일기 글을 만들어 볼까요?</p>
              <Button block icon={assets.iconSparkle} onClick={make}>일기 글 만들기</Button>
              <p className="t-caption v3-muted v3-center">더 이상 답변을 입력할 수 없어요</p>
            </div>
          )}
          {!full && (
            <form className="v3-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input ref={inputRef} className="v3-input" placeholder="답변을 입력하세요" value={text} onChange={(e) => setText(e.target.value)} aria-label="답변 입력" />
              <button type="submit" className="v3-send" aria-label="보내기" disabled={!text.trim() || busy}><img src={assets.iconSend} alt="" /></button>
            </form>
          )}
        </>
      }
    >
      {!desk && (
        <div className="v3-chat-head">
          <span className="v3-prow__th"><PhotoImg p={p} raw /></span>
          {bar}
        </div>
      )}
      <div className="v3-chat" aria-live="polite">
        {p.chat.map((m, k) => (
          <div key={k} className={`v3-msg v3-msg--${m.r}`}>
            {m.r === 'ai' && <i className="v3-msg__ico"><img src={assets.iconEdit} alt="" /></i>}
            <p>{m.t}</p>
          </div>
        ))}
        {busy && <div className="v3-msg v3-msg--ai"><p><Spinner /></p></div>}
        {hint && <p className="v3-chat__hint t-caption">이만하면 일기 한 장이 충분해요. 더 이야기해도 좋아요.</p>}
        <span ref={endRef} />
      </div>
    </Page>
  );
}

/* ─────────── C7 · 글 생성 중 ─────────── */
export function CreateWriting() {
  const nav = useNavigate();
  const { n } = useParams();
  const { draft } = useApp();
  const s = useDemoLoader(['writing']);
  const p = draft.photos[Number(n) - 1];
  useEffect(() => {
    if (p?.talk === 'done') nav('/create/talk', { replace: true });
  }, [p?.talk, nav]);
  if (!p && !s) return <Navigate to="/create" replace />;
  return (
    <Page bg="wood" title={null} step={null} wide>
      <div className="v3-writing">
        <div className="v3-writing__book">
          <Tape color="rose" w={92} h={26} rotate={-3} style={{ left: 132, top: -10 }} />
          <p className="t-date">{longDay(draft.day())}</p>
          <p className="t-caption">{p ? guOf(p) : '마포구'}</p>
          <div className="v3-writing__img">{p && <PhotoImg p={p} raw />}</div>
          {[88, 72, 80, 56].map((w, k) => <span key={k} className="skeleton" style={{ width: `${w}%` }} />)}
        </div>
        <div className="note v3-writing__card">
          <h2 className="t-title">일기 글을 쓰고 있어요</h2>
          <p className="t-body">대화 내용으로 페이지 {n}의 글을 만들고 있어요. 수 초 정도 걸려요.</p>
        </div>
      </div>
    </Page>
  );
}

/* ─────────── C8 · 미리보기 ─────────── */
function useReadyDemo() {
  const s = useDemoLoader(READY_KINDS);
  return s;
}
export function CreatePreview() {
  const nav = useNavigate();
  const desk = useDesktop();
  const { draft } = useApp();
  const s = useReadyDemo();
  const [sp, setSp] = useSearchParams();
  const i = Math.max(0, Number(sp.get('p') || 1) - 1);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const photos = draft.photos;
  const p = photos[Math.min(i, photos.length - 1)];
  const go = (k) => { const q = new URLSearchParams(sp); q.set('p', String(k + 1)); setSp(q, { replace: true }); };

  if (!p) return s ? null : <Navigate to="/create" replace />;
  const regen = () => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (s === 'regenfail') return setToast('새 이미지를 만들지 못했어요. 기존 이미지를 그대로 둘게요.');
      draft.set(p.id, { filter: (p.filter || 0) + 1 });
    }, 1100);
  };
  const edit = `/create/edit/${i + 1}${s ? `?s=${s}` : ''}`;
  const pub = `/create/publish${s ? '?s=publish' : ''}`;

  const view = (
    <div className="v3-prev">
      <div className="v3-prev__meta"><span className="t-date">{longDay(draft.day())}</span><span className="t-caption">{guOf(p)}</span></div>
      <div className="v3-prev__frame">
        <Tape color="sage" w={80} h={24} rotate={-4} style={{ left: 28, top: -10 }} />
        <PhotoImg p={p} className="v3-prev__img" />
        {busy && <div className="v3-prev__busy"><Spinner /></div>}
      </div>
      <p className="v3-prev__text t-body">{p.text || '아직 글이 없어요.'}</p>
    </div>
  );

  return (
    <Page
      title="미리보기"
      wide
      step={4}
      onBack={() => nav('/create/talk')}
      dtitle="미리보기"
      foot={
        <>
          <Pager i={Math.min(i, photos.length - 1)} n={photos.length} onPrev={() => go(i - 1)} onNext={() => go(i + 1)} />
          <div className={desk ? 'v3-two' : 'v3-stack'}>
            <div className="v3-two">
              <Button variant="ghost" block icon={assets.iconRefresh} onClick={regen} disabled={busy}>이미지 다시 만들기</Button>
              <Button variant="ghost" block icon={assets.iconEdit} onClick={() => nav(edit)}>글 수정</Button>
            </div>
            <Button block onClick={() => nav(pub)}>공개 설정하고 저장</Button>
          </div>
        </>
      }
      overlay={toast && <Toast onDone={() => setToast(null)}>{toast}</Toast>}
    >
      {view}
    </Page>
  );
}

/* ─────────── C9 · 글 수정 (새 일기 / 내 일기 공용) ─────────── */
export function EditText({ mine }) {
  const nav = useNavigate();
  const { n, id } = useParams();
  const { draft, diary } = useApp();
  const s = useDemoLoader(READY_KINDS);
  const entry = mine ? diary.get(id) : null;
  const idx = Number(n || new URLSearchParams(window.location.search).get('p') || 1) - 1;
  const page = mine ? entry?.pages[idx] : draft.photos[idx];
  const [text, setText] = useState(page?.text || '');
  useEffect(() => {
    if (page) setText(page.text || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id]);
  if (!page) return s ? null : <Navigate to={mine ? '/mine' : '/create'} replace />;
  const done = () => {
    const t = text.slice(0, TEXT_MAX);
    if (mine) {
      diary.setText(id, page.id, t);
      nav(`/mine/${id}?p=${idx + 1}`, { replace: true });
    } else {
      draft.set(page.id, { text: t });
      nav(`/create/preview?p=${idx + 1}${s ? `&s=${s}` : ''}`, { replace: true });
    }
  };
  return (
    <Page
      title="글 수정"
      right={<button type="button" className="v3-done" onClick={done}>완료</button>}
      onBack={() => nav(-1)}
      foot={<Button block className="v3-desk-only" onClick={done}>완료</Button>}
    >
      <p className="t-caption-strong">페이지 {idx + 1} <span className="v3-muted">{guOf(page)}</span></p>
      <textarea className="v3-textarea" value={text} maxLength={TEXT_MAX} onChange={(e) => setText(e.target.value)} aria-label="일기 글" />
      <div className="v3-row"><span className="t-caption v3-muted">글은 {TEXT_MAX}자까지 쓸 수 있어요</span><span className="t-caption">{text.length} / {TEXT_MAX}</span></div>
    </Page>
  );
}

/* ─────────── C10 · 공개 설정 (새 일기 저장) / N3 · 공개 범위 변경 (내 일기) ─────────── */
export function Publish({ mine }) {
  const nav = useNavigate();
  const { id } = useParams();
  const { draft, diary } = useApp();
  const s = useReadyDemo();
  const entry = mine ? diary.get(id) : null;
  const pages = mine ? entry?.pages : draft.photos;
  const [pub, setPub] = useState(mine ? !!entry?.public : true);
  const [vis, setVis] = useState({});
  const [card, setCard] = useState(null);
  const [saving, setSaving] = useState(false);
  if (!pages || pages.length === 0) return s ? null : <Navigate to={mine ? '/mine' : '/create'} replace />;

  const locked = (p) => (mine ? p.blocked || p.unknownGu || p.gu === '위치 모름' : p.gu === 'unknown');
  const val = (p) => (!pub || locked(p) ? 'private' : vis[p.id] ?? p.vis ?? 'public');
  const setV = (p, v) => setVis({ ...vis, [p.id]: v });
  const save = () => {
    if (!mine && !draft.ready() && !s) return setCard('DIARY_INCOMPLETE');
    setSaving(true);
    if (mine) {
      diary.setVisibility(id, pub, vis);
      return nav(`/mine/${id}`, { replace: true });
    }
    pages.forEach((p) => draft.set(p.id, { vis: val(p) }));
    setTimeout(() => {
      const e = draft.save(pub);
      nav(`/mine/${e.id}`, { replace: true });
    }, 0);
  };
  const tryLocked = (p) => setCard(mine && p.blocked ? null : 'PAGE_NOT_SHAREABLE');

  return (
    <Page
      title={mine ? '공개 범위 변경' : '공개 설정'}
      step={mine ? undefined : 4}
      onBack={() => nav(-1)}
      foot={
        <>
          <p className="t-caption v3-muted v3-center">공개·글만 페이지는 소셜 다이어리에 바로 보여요</p>
          <Button block onClick={save} disabled={saving}>{mine ? '변경 저장' : '일기 저장'}</Button>
        </>
      }
      overlay={card && <ErrorCard code={card} onClose={() => setCard(null)} />}
    >
      <div className="v3-card v3-card--row">
        <span><b className="t-body-strong">일기 공개</b><span className="t-caption v3-muted" style={{ display: 'block' }}>끄면 모든 페이지가 비공개가 돼요</span></span>
        <Toggle on={pub} onChange={setPub} label="일기 공개" />
      </div>
      <ul className="v3-plist">
        {pages.map((p, k) => (
          <li key={p.id} className={`v3-vrow ${locked(p) ? 'v3-vrow--lock' : ''}`}>
            <span className="v3-prow__th"><PhotoImg p={p} /></span>
            <span className="v3-prow__t">
              <b className="t-body-strong">페이지 {k + 1}</b>
              {locked(p) && (
                <button type="button" className="t-caption v3-muted v3-lockmsg" onClick={() => tryLocked(p)}>
                  {mine && p.blocked ? '신고로 차단돼 다시 공개할 수 없어요' : '위치를 몰라 공유할 수 없어요'}
                </button>
              )}
            </span>
            <VisSeg value={val(p)} onChange={(v) => setV(p, v)} disabled={!pub || locked(p)} />
          </li>
        ))}
      </ul>
    </Page>
  );
}

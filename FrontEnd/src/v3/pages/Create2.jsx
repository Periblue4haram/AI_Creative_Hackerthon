import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import assets from '../../assetMap.js';
import { Button, Tape } from '../../components/common.jsx';
import useDesktop from '../../hooks/useDesktop.js';
import { CHAT_HINT, CHAT_MAX, MAX_BYTES, OK_TYPES, TEXT_MAX, longDay } from '../data.js';
import { useApp } from '../store.jsx';
import { Confirm, ErrorCard, Page, PhotoImg, Pager, Sheet, Spinner, Toast, Toggle, VisSeg, useFilePicker, usePreview } from '../ui.jsx';

const guOf = (p) => (p.gu === 'unknown' ? '위치 모름' : p.gu);

/* ─────────── C5 · 페이지 현황 ─────────── */
export function CreateTalk() {
  const nav = useNavigate();
  const { draft } = useApp();
  const s = usePreview();
  const [sheet, setSheet] = useState(null); // 변환 실패 선택 시트 (사진 id)
  const [card, setCard] = useState(null);
  const [rid, setRid] = useState(null);
  const [leave, setLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const seen = useRef(new Set());
  const photos = draft.photos;

  useEffect(() => {
    draft.refresh(); // 이어 쓰는 경우를 위해 한 번 최신 상태로 맞춘다 (변환 중이면 이후 3초마다 자동으로 읽는다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // 변환이 실패한 페이지가 생기면 선택 시트를 한 번 띄운다 (사진 교체 · 원본 사용 · 다시 시도)
  useEffect(() => {
    const f = photos.find((p) => p.conv === 'fail' && !seen.current.has(p.id));
    if (f) {
      seen.current.add(f.id);
      setSheet(f.id);
    }
  }, [photos]);

  const [pick, input] = useFilePicker(async (fs) => {
    const f = fs[0];
    if (!OK_TYPES.includes(f.type)) return setCard('UNSUPPORTED_IMAGE_TYPE');
    if (f.size > MAX_BYTES) return setCard('FILE_TOO_LARGE');
    const r = await draft.replace(rid, f);
    if (!r.ok) return setCard(r.code);
    seen.current.delete(rid);
    setSheet(null);
    nav('/create/info'); // 새 사진에 빠진 날짜·위치가 있으면 다시 채운다
  }, false);

  if (photos.length === 0 && !s) return <Navigate to="/create" replace />;
  const talkBadge = (p) => (p.talk === 'done' ? ['대화 완료', 'ok'] : p.talk === 'ing' || p.talk === 'writing' ? ['대화 중', 'on'] : ['대화 전', '']);
  const convBadge = (p) => ({ run: ['그림 변환 중', ''], done: ['그림 완료', 'ok'], orig: ['원본 사용', 'ok'], fail: ['변환 실패', 'bad'] })[p.conv];
  const go = (p, i) => (p.conv === 'fail' ? setSheet(p.id) : nav(`/create/talk/${i + 1}`));
  const sp = photos.find((p) => p.id === sheet);
  const act = async (fn) => {
    setSheet(null);
    const r = await fn();
    if (!r.ok) setCard(r.code);
  };

  return (
    <Page
      title="페이지별 이야기"
      dtitle="새 일기"
      step={3}
      onBack={() => nav('/create')}
      foot={
        <>
          <p className="t-caption v3-muted v3-center">모든 페이지의 글과 그림이 준비되면 미리보기로 넘어가요</p>
          <Button block variant={draft.ready() ? 'primary' : 'secondary'} onClick={() => (draft.ready() ? nav('/create/preview') : setCard('DIARY_INCOMPLETE'))}>
            미리보기
          </Button>
          <Button block variant="ghost" onClick={() => setLeave(true)}>이 일기 버리고 새로 시작</Button>
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
          {leave && (
            <Confirm
              title="이 일기를 버릴까요?"
              body="올린 사진과 대화, 글이 모두 지워지고 되돌릴 수 없어요."
              ok="버리기"
              onCancel={() => setLeave(false)}
              onOk={async () => { setBusy(true); await draft.discard(); setBusy(false); setLeave(false); nav('/create', { replace: true }); }}
            />
          )}
          {sp && (
            <Sheet onClose={() => setSheet(null)}>
              <div className="v3-prow v3-prow--flat">
                <span className="v3-prow__th v3-prow__th--lg"><PhotoImg p={sp} /></span>
                <span className="v3-prow__t"><b className="t-heading">페이지 {photos.indexOf(sp) + 1} 변환에 실패했어요</b><span className="t-caption">다시 시도해도 그림으로 바꾸지 못했어요.</span></span>
              </div>
              <div className="v3-stack">
                <Button block icon={assets.iconRefresh} disabled={busy} onClick={() => act(() => draft.regenerate(sp.id))}>다시 시도</Button>
                <Button block variant="secondary" disabled={busy} onClick={() => act(() => draft.useOriginal(sp.id))}>원본 사용</Button>
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
                <span className="v3-prow__th v3-prow__th--lg"><PhotoImg p={p} /></span>
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
export function CreateChat() {
  const nav = useNavigate();
  const desk = useDesktop();
  const { n } = useParams();
  const { state } = useLocation();
  const { draft } = useApp();
  const s = usePreview();
  const i = Number(n) - 1;
  const p = draft.photos[i];
  const [text, setText] = useState('');
  const [card, setCard] = useState(state?.card || null); // 글 만들기에 실패해 돌아온 경우
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (!p) return;
    draft.openChat(p.id).then((r) => !r.ok && setCard(r.code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id]);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [p?.chat.length, busy]);

  if (!p) return draft.photos.length === 0 && !s ? <Navigate to="/create" replace /> : null;
  const chars = p.chars;
  const full = p.limit || chars >= CHAT_MAX;
  const hint = (p.hint || chars >= CHAT_HINT) && !full;
  const done = p.talk === 'done'; // 글을 만든 뒤에는 대화를 이어 갈 수 없다
  const loading = !p.chatLoaded;
  const convLabel = { run: '그림 변환 중', done: '그림 완료', orig: '원본 사용', fail: '변환 실패' }[p.conv];

  const send = async () => {
    const t = text.trim();
    if (!t || busy || full || done || loading) return;
    setBusy(true);
    const r = await draft.sendChat(p.id, t.slice(0, 500));
    setBusy(false);
    if (r.ok) setText('');
    else setCard(r.code); // 실패하면 쓰던 답변은 입력창에 그대로 둔다
  };
  const make = () => {
    if (!p.chat.some((m) => m.r === 'me')) return setCard('NO_USER_MESSAGE');
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
      right={full || done ? null : genBtn}
      step={3}
      side={
        <>
          <h2 className="t-heading">페이지 {n} / {draft.photos.length}</h2>
          <div style={{ alignSelf: 'center', transform: 'rotate(-2deg)' }}>
            <div className="polaroid" style={{ '--s': 1.5 }}><div className="polaroid__photo"><PhotoImg p={p} /></div><p className="polaroid__caption">{guOf(p) || ''}</p></div>
          </div>
          {bar}
          <div className="v3-thumbs">
            {draft.photos.map((x, k) => (
              <button key={x.id} type="button" className={k === i ? 'on' : ''} onClick={() => nav(`/create/talk/${k + 1}`)} aria-label={`페이지 ${k + 1}`}><PhotoImg p={x} /></button>
            ))}
          </div>
        </>
      }
      overlay={card && <ErrorCard code={card} onClose={() => setCard(null)} onAction={[() => { setCard(null); inputRef.current?.focus(); }]} />}
      foot={
        <>
          {(full || done) && (
            <div className="v3-card v3-card--note">
              <b className="t-body-strong">{done ? '이 페이지의 글을 만들었어요' : '일기 분량을 다 채웠어요'}</b>
              <p className="t-caption">{done ? '글은 미리보기에서 고칠 수 있어요. 대화로 다시 만들 수도 있어요.' : '이제 대화 내용으로 일기 글을 만들어 볼까요?'}</p>
              <Button block icon={assets.iconSparkle} onClick={make}>{done ? '일기 글 다시 만들기' : '일기 글 만들기'}</Button>
              <p className="t-caption v3-muted v3-center">더 이상 답변을 입력할 수 없어요</p>
            </div>
          )}
          {!full && !done && (
            <form className="v3-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <input ref={inputRef} className="v3-input" placeholder="답변을 입력하세요" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} aria-label="답변 입력" />
              <button type="submit" className="v3-send" aria-label="보내기" disabled={!text.trim() || busy || loading}><img src={assets.iconSend} alt="" /></button>
            </form>
          )}
        </>
      }
    >
      {!desk && (
        <div className="v3-chat-head">
          <span className="v3-prow__th"><PhotoImg p={p} /></span>
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
        {(busy || loading) && <div className="v3-msg v3-msg--ai"><p><Spinner /></p></div>}
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
  const s = usePreview();
  const p = draft.photos[Number(n) - 1];
  useEffect(() => {
    if (!p) return;
    if (p.talk === 'done') nav('/create/talk', { replace: true });
    // 글 만들기에 실패했거나, 글을 만들던 중이 아닌데 들어왔다면 대화 화면으로 돌려보낸다
    else if (p.error || p.talk !== 'writing') nav(`/create/talk/${n}`, { replace: true, state: p.error ? { card: p.error } : null });
  }, [p?.talk, p?.error, n, nav]);
  if (!p && !s) return <Navigate to="/create" replace />;
  return (
    <Page bg="wood" title={null} step={null} wide>
      <div className="v3-writing">
        <div className="v3-writing__book">
          <Tape color="rose" w={92} h={26} rotate={-3} style={{ left: 132, top: -10 }} />
          <p className="t-date">{draft.day() ? longDay(draft.day()) : ''}</p>
          <p className="t-caption">{p ? guOf(p) : '마포구'}</p>
          <div className="v3-writing__img">{p && <PhotoImg p={p} />}</div>
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
export function CreatePreview() {
  const nav = useNavigate();
  const desk = useDesktop();
  const { draft } = useApp();
  const s = usePreview();
  const [sp, setSp] = useSearchParams();
  const i = Math.max(0, Number(sp.get('p') || 1) - 1);
  const [toast, setToast] = useState(null);
  const [card, setCard] = useState(null);
  const [regenId, setRegenId] = useState(null); // 이미지를 다시 만드는 중인 페이지
  const [asking, setAsking] = useState(false);
  const photos = draft.photos;
  const p = photos[Math.min(i, photos.length - 1)];
  const go = (k) => { const q = new URLSearchParams(sp); q.set('p', String(k + 1)); setSp(q, { replace: true }); };

  // 다시 만들기가 끝나면(변환 중이 아니게 되면) 결과를 알린다. 실패해도 기존 이미지는 그대로다.
  useEffect(() => {
    const q = photos.find((x) => x.id === regenId);
    if (regenId && q && q.conv !== 'run') {
      setRegenId(null);
      if (q.imageError) setToast('새 이미지를 만들지 못했어요. 기존 이미지를 그대로 둘게요.');
    }
  }, [photos, regenId]);

  if (!p) return s ? null : <Navigate to="/create" replace />;
  const busy = asking || (regenId === p.id && p.conv === 'run');
  const regen = async () => {
    if (busy) return;
    setAsking(true);
    const r = await draft.regenerate(p.id);
    setAsking(false);
    if (!r.ok) return setCard(r.code);
    setRegenId(p.id);
  };
  const edit = `/create/edit/${i + 1}`;

  const view = (
    <div className="v3-prev">
      <div className="v3-prev__meta"><span className="t-date">{draft.day() ? longDay(draft.day()) : ''}</span><span className="t-caption">{guOf(p)}</span></div>
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
            <Button block onClick={() => nav('/create/publish')}>공개 설정하고 저장</Button>
          </div>
        </>
      }
      overlay={
        <>
          {toast && <Toast onDone={() => setToast(null)}>{toast}</Toast>}
          {card && <ErrorCard code={card} onClose={() => setCard(null)} />}
        </>
      }
    >
      {view}
    </Page>
  );
}

/** 내 일기(mine)일 때 일기 한 편을 서버에서 불러온다 */
function useMyEntry(mine, id) {
  const { diary } = useApp();
  const [st, setSt] = useState({ entry: null, failed: false });
  useEffect(() => {
    if (!mine) return undefined;
    let alive = true;
    diary.fetch(id).then((r) => alive && setSt(r.ok ? { entry: r.data, failed: false } : { entry: null, failed: true }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, id]);
  return st;
}

/* ─────────── C9 · 글 수정 (새 일기 / 내 일기 공용) ─────────── */
export function EditText({ mine }) {
  const nav = useNavigate();
  const { n, id } = useParams();
  const { draft, diary } = useApp();
  const s = usePreview();
  const { entry, failed } = useMyEntry(mine, id);
  const idx = Number(n || new URLSearchParams(window.location.search).get('p') || 1) - 1;
  const page = mine ? entry?.pages[idx] : draft.photos[idx];
  const [text, setText] = useState(page?.text || '');
  const [card, setCard] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (page) setText(page.text || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id]);
  if (mine && failed) return <Navigate to="/mine" replace />;
  if (!page) return mine || s ? null : <Navigate to="/create" replace />;
  const done = async () => {
    const t = text.slice(0, TEXT_MAX);
    if (!t.trim()) return setCard('VALIDATION_FAILED'); // 글은 1~800자
    if (saving) return;
    setSaving(true);
    const r = mine ? await diary.setText(page.id, t) : await draft.setText(page.id, t);
    setSaving(false);
    if (!r.ok) return setCard(r.code);
    nav(mine ? `/mine/${id}?p=${idx + 1}` : `/create/preview?p=${idx + 1}`, { replace: true });
  };
  return (
    <Page
      title="글 수정"
      right={<button type="button" className="v3-done" onClick={done} disabled={saving}>완료</button>}
      onBack={() => nav(-1)}
      foot={<Button block className="v3-desk-only" onClick={done} disabled={saving}>완료</Button>}
      overlay={card && <ErrorCard code={card} onClose={() => setCard(null)} />}
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
  const s = usePreview();
  const { entry, failed } = useMyEntry(mine, id);
  const pages = mine ? entry?.pages : draft.photos;
  const [pub, setPub] = useState(true);
  const [vis, setVis] = useState({});
  const [card, setCard] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (entry) setPub(entry.public);
  }, [entry]);
  if (mine && failed) return <Navigate to="/mine" replace />;
  if (!pages || pages.length === 0) return mine || s ? null : <Navigate to="/create" replace />;

  // 위치를 모르는 페이지(shareable=false)와 신고로 차단된 페이지는 공개할 수 없다
  const locked = (p) => !!p.blocked || p.shareable === false || p.gu === 'unknown';
  // 새 일기는 공유할 수 있는 페이지를 공개로 미리 골라 둔다. 내 일기는 지금 저장된 값에서 시작한다.
  const val = (p) => (!pub || locked(p) ? 'private' : vis[p.id] ?? (mine ? p.vis : 'public'));
  const setV = (p, v) => setVis({ ...vis, [p.id]: v });
  const toggle = (on) => {
    setPub(on);
    // 비공개였던 내 일기를 공개로 켜면 공유할 수 있는 페이지를 공개로 미리 골라 준다
    if (on && mine && entry && !entry.public) setVis(Object.fromEntries(pages.filter((p) => !locked(p)).map((p) => [p.id, 'public'])));
  };
  const save = async () => {
    if (saving) return;
    if (!mine && !draft.ready() && !s) return setCard('DIARY_INCOMPLETE');
    setSaving(true);
    const map = Object.fromEntries(pages.map((p) => [p.id, val(p)]));
    const r = mine ? await diary.setVisibility(id, pub, map) : await draft.save(pub, map);
    setSaving(false);
    if (!r.ok) return setCard(r.code); // PAGE_NOT_SHAREABLE · DIARY_INCOMPLETE · PAGE_REPORT_BLOCKED …
    nav(`/mine/${mine ? id : r.id}`, { replace: true });
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
          <Button block onClick={save} disabled={saving}>{saving ? '저장하는 중…' : mine ? '변경 저장' : '일기 저장'}</Button>
        </>
      }
      overlay={card && <ErrorCard code={card} onClose={() => setCard(null)} />}
    >
      <div className="v3-card v3-card--row">
        <span><b className="t-body-strong">일기 공개</b><span className="t-caption v3-muted" style={{ display: 'block' }}>끄면 모든 페이지가 비공개가 돼요</span></span>
        <Toggle on={pub} onChange={toggle} label="일기 공개" />
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

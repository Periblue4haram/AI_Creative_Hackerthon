import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import assets from '../../assetMap.js';
import { Button } from '../../components/common.jsx';
import { NOTICE_ICONS } from '../../components/NoticeSheet.jsx';
import useDesktop from '../../hooks/useDesktop.js';
import { DEMO_PHOTOS, GUS, MAX_BYTES, MAX_PHOTOS, OK_TYPES, clockOf, monthDayDot, parseDay } from '../data.js';
import { useApp } from '../store.jsx';
import { ErrorCard, Field, Input, Page, PhotoImg, Sheet, useFilePicker, usePreview } from '../ui.jsx';

/** 파일 → 초안 사진 (EXIF 를 읽을 수 없으니 촬영 시각은 파일 수정 시각으로 대신한다) */
const fromFile = (f) => ({ url: URL.createObjectURL(f), name: f.name, at: new Date(f.lastModified || Date.now()), gu: null });

/** 검수용 미리보기 상태(`?s=`)에 맞는 예시 사진 묶음 */
const READY = ['ok', 'regenfail', 'edit', 'publish'];
const TALK_LIKE = ['date', 'mismatch', 'talk', 'fail', 'chat', '500', '800', 'aifail', 'writing'];
const DEMO_TEXT = [
  '오늘은 연남동 골목을 천천히 걸었다. 붉은 벽돌 건물 1층 카페에서 라테를 마시며 소설을 읽었는데, 창밖으로 오후 햇살이 길게 들어와 펼친 책 위가 따뜻하게 물들었다.',
  '한강 변을 따라 걸으며 노을을 기다렸다. 바람이 선선해서 오래 앉아 있었다.',
  '돌담길을 따라 걷다가 처마 아래에서 잠시 쉬었다. 젖은 돌 냄새가 좋았다.',
  '저녁에는 시장 골목에서 따뜻한 국물을 먹고 집으로 돌아왔다.',
];
function demoSet(kind) {
  const p = DEMO_PHOTOS.map((d) => ({ ...d }));
  if (kind === 'date') p[2].gu = '마포구';
  if (kind === 'mismatch') {
    p[2].gu = '마포구';
    p[3].at = new Date(2026, 10, 6, 17, 0);
    p[1].at = new Date(2026, 10, 5, 22, 40);
  }
  if (TALK_LIKE.includes(kind) && kind !== 'date' && kind !== 'mismatch') {
    p[2].gu = '마포구';
    p[3].at = new Date(2026, 10, 6, 17, 20);
  }
  if (READY.includes(kind)) {
    p[2].gu = '마포구';
    p[3].at = new Date(2026, 10, 6, 17, 20);
    p[3].gu = 'unknown';
    p.forEach((x, k) => Object.assign(x, { conv: 'done', talk: 'done', text: DEMO_TEXT[k], failConv: false }));
  }
  return p;
}
export function useDemoLoader(kinds) {
  const { draft } = useApp();
  const s = usePreview();
  useEffect(() => {
    if (s && (kinds.includes(s)) && draft.photos.length === 0) draft.addFiles(demoSet(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);
  return s;
}
export { demoSet };

const GUS_TEXT = GUS.join(', ');

/** C1 · 사진 올리기 */
export function CreatePhotos() {
  const nav = useNavigate();
  const desk = useDesktop();
  const { draft } = useApp();
  const s = useDemoLoader(['selected', 'out']);
  const [card, setCard] = useState(null);
  const photos = draft.photos;

  const [pick, input] = useFilePicker((files) => {
    const okType = files.filter((f) => OK_TYPES.includes(f.type));
    if (okType.length < files.length) return setCard('UNSUPPORTED_IMAGE_TYPE');
    const small = okType.filter((f) => f.size <= MAX_BYTES);
    if (small.length < okType.length) return setCard('FILE_TOO_LARGE');
    if (photos.length + small.length > MAX_PHOTOS) {
      setCard('PAGE_LIMIT_EXCEEDED');
      return;
    }
    draft.addFiles(small.map(fromFile));
  });
  const [replaceId, setReplaceId] = useState(null);
  const [pickOne, inputOne] = useFilePicker((files) => {
    const f = files[0];
    if (!OK_TYPES.includes(f.type)) return setCard('UNSUPPORTED_IMAGE_TYPE');
    if (f.size > MAX_BYTES) return setCard('FILE_TOO_LARGE');
    draft.replace(replaceId, fromFile(f));
  }, false);

  const has = photos.length > 0;
  const label = (p, i) => `사진 ${i + 1}`;
  const meta = (p) => `${p.at ? `${monthDayDot(p.at)}${p.timed === false ? '' : ` ${clockOf(p.at)}`}` : ''}${p.gu ? ` · ${p.gu === 'unknown' ? '위치 모름' : p.gu}` : ''}`.trim();

  const side = has ? (
    <>
      <h2 className="t-heading">사진 {photos.length}장을 골랐어요</h2>
      <div className="v3-pgrid">
        {photos.map((p, i) => (
          <figure key={p.id} className="v3-pgrid__i" style={{ transform: `rotate(${[-2, 2, 2, -3][i % 4]}deg)` }}>
            <div className="polaroid" style={{ '--s': 1 }}>
              <div className="polaroid__photo" style={{ height: 96 }}><PhotoImg p={p} raw /></div>
              <p className="polaroid__caption">{label(p, i)}</p>
            </div>
          </figure>
        ))}
      </div>
    </>
  ) : (
    <>
      <h2 className="t-heading">오늘의 사진을 골라 주세요</h2>
      <p className="t-caption">1~4장 · 같은 날 찍은 사진<br />JPEG, PNG, WebP · 장당 10MB</p>
      <div className="v3-info"><img src={assets.iconPin} alt="" /><p className="t-caption">{GUS_TEXT}에서 찍은 사진만 일기로 만들 수 있어요.</p></div>
    </>
  );

  return (
    <Page
      title="새 일기"
      back="close"
      onBack={() => { draft.reset(); nav('/'); }}
      step={1}
      side={side}
      foot={
        has ? (
          <Button block={!desk} disabled={photos.length === 0} onClick={() => nav('/create/info')}>다음</Button>
        ) : (
          <Button block={!desk} variant="secondary" disabled>사진을 골라 주세요</Button>
        )
      }
      overlay={
        <>
          {card && <ErrorCard code={card} onClose={() => setCard(null)} onAction={[() => { setCard(null); pick(); }]} />}
          {s === 'out' && <OutOfArea onClose={() => nav('/create?s=selected')} onPick={pick} idx={1} p={photos[1]} />}
        </>
      }
    >
      {input}
      {inputOne}
      {!has ? (
        <div className="v3-drop">
          <div className="v3-drop__in">
            <span className="v3-drop__ico">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg>
            </span>
            <p className="t-caption v3-desk-only">사진을 끌어다 놓거나 클릭해서 고르기</p>
            <Button small icon={assets.iconPlusCream} onClick={pick}>사진 고르기</Button>
            <button type="button" className="v3-link t-caption" onClick={() => draft.addFiles(demoSet('selected'))}>예시 사진으로 둘러보기</button>
          </div>
          <div className="v3-mobile-only">
            <h2 className="v3-h2">오늘의 사진을<br />골라 주세요</h2>
            <p className="t-caption">1~4장 · 같은 날 찍은 사진 · JPEG, PNG, WebP · 장당 10MB</p>
            <div className="v3-info"><img src={assets.iconPin} alt="" /><p className="t-caption">{GUS_TEXT}에서 찍은 사진만 일기로 만들 수 있어요.</p></div>
          </div>
        </div>
      ) : (
        <>
          <h2 className="v3-h2 v3-mobile-only">사진 {photos.length}장을 골랐어요</h2>
          <p className="t-caption v3-lead">{desk ? '빠진 정보가 있는 사진은 다음 단계에서 채워요. 정보를 채우면 시간순으로 정렬해요.' : '다음 단계에서 빠진 정보를 채우고 시간순으로 정렬해요.'}</p>
          <ul className="v3-plist">
            {photos.map((p, i) => (
              <li key={p.id} className="v3-prow">
                <span className="v3-prow__th"><PhotoImg p={p} raw /></span>
                <span className="v3-prow__t">
                  <b className="t-caption-strong">{label(p, i)}</b>
                  <span className="t-caption">{meta(p) || ' '}</span>
                  <span className="v3-badges">
                    {!p.gu && <i className="v3-badge v3-badge--bad">위치 입력 필요</i>}
                    {!p.at && <i className="v3-badge v3-badge--bad">날짜 입력 필요</i>}
                  </span>
                </span>
                <button type="button" aria-label={`${label(p, i)} 바꾸기`} onClick={() => { setReplaceId(p.id); setTimeout(pickOne, 0); }}><img src={assets.iconRefresh} alt="" /></button>
                <button type="button" aria-label={`${label(p, i)} 지우기`} onClick={() => draft.remove(p.id)}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                </button>
              </li>
            ))}
          </ul>
          {photos.length < MAX_PHOTOS && <Button small variant="ghost" icon={null} onClick={pick}>+ 사진 더 고르기</Button>}
        </>
      )}
    </Page>
  );
}

/** C1-E · 서비스 지역 밖 사진 */
function OutOfArea({ onClose, onPick, p, idx }) {
  return (
    <Sheet onClose={onClose} tape>
      <span className="notice__icon">{NOTICE_ICONS.pin}</span>
      <h2 className="t-heading">이 사진은 넣을 수 없어요</h2>
      <p className="t-body">5개의 구 외에는 아직 불가능합니다</p>
      <div className="v3-prow v3-prow--flat">
        <span className="v3-prow__th">{p && <PhotoImg p={p} raw />}</span>
        <span className="v3-prow__t"><b className="t-caption-strong">사진 {idx + 1}</b><span className="t-caption">사진 위치가 서비스 지역 밖이에요</span></span>
        <i className="v3-badge v3-badge--bad">지역 밖</i>
      </div>
      <p className="t-caption-strong">지금 쓸 수 있는 구</p>
      <div className="chip-row">{GUS.map((g) => <span key={g} className="chip chip--tight">{g}</span>)}</div>
      <div className="notice__actions"><button type="button" className="btn btn--sm btn--primary" onClick={() => { onClose(); onPick(); }}>다른 사진 고르기</button></div>
    </Sheet>
  );
}

/** C2·C3·C4 · 빠진 정보 채우기 / 날짜 확인 */
export function CreateInfo() {
  const nav = useNavigate();
  const { draft } = useApp();
  const s = useDemoLoader(['loc', 'locE', 'locU', 'date', 'mismatch']);
  const todo = draft.nextTodo();
  const photos = draft.photos;

  useEffect(() => {
    if (photos.length && !todo) {
      draft.sort();
      nav('/create/talk', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, todo]);

  if (photos.length === 0 && !s) return <Navigate to="/create" replace />;
  if (!todo) return null;
  const idx = photos.findIndex((x) => x.id === todo.p.id);
  if (todo.type === 'mismatch') return <Mismatch key={todo.p.id} p={todo.p} idx={idx} day={todo.day} />;
  return todo.type === 'gu' ? <AskLocation key={todo.p.id} p={todo.p} idx={idx} /> : <AskDate key={todo.p.id} p={todo.p} idx={idx} />;
}

const sidePhoto = (p, idx) => (
  <>
    <h2 className="t-heading">사진 {idx + 1}</h2>
    <div style={{ alignSelf: 'center', transform: 'rotate(-2deg)' }}>
      <div className="polaroid" style={{ '--s': 1.6 }}>
        <div className="polaroid__photo"><PhotoImg p={p} raw /></div>
        <p className="polaroid__caption">사진 {idx + 1}</p>
      </div>
    </div>
  </>
);

function AskLocation({ p, idx }) {
  const nav = useNavigate();
  const { draft } = useApp();
  const s = usePreview();
  const [v, setV] = useState(s === 'locE' ? '해운대구' : '');
  const [bad, setBad] = useState(s === 'locE');
  const [unk, setUnk] = useState(s === 'locU');
  const submit = () => {
    const name = v.trim();
    if (!GUS.includes(name)) return setBad(true);
    draft.set(p.id, { gu: name });
  };
  return (
    <Page
      title="빠진 정보 입력"
      right={`사진 ${idx + 1}`}
      back="back"
      onBack={() => nav('/create')}
      dtitle="새 일기"
      step={2}
      side={sidePhoto(p, idx)}
      foot={<Button block onClick={unk ? () => draft.set(p.id, { gu: 'unknown' }) : submit}>다음</Button>}
    >
      <h2 className="v3-h2">이 사진의 위치는 어디입니까?</h2>
      {unk ? (
        <div className="v3-card v3-card--note">
          <span className="notice__icon">{NOTICE_ICONS.pin}</span>
          <h3 className="t-heading">이 페이지는 공유할 수 없어요</h3>
          <p className="t-body">위치를 모르는 페이지는 비공개로만 저장돼요. 사진 위치가 떠오르면 다시 입력할 수 있어요.</p>
          <Button small variant="ghost" onClick={() => setUnk(false)}>위치 다시 입력하기</Button>
        </div>
      ) : (
        <>
          <Field label="구 이름" error={bad ? '5개의 구 외에는 아직 불가능합니다' : null} hint={`${GUS_TEXT} 중 하나를 그대로 입력해요`}>
            {(id, b) => <Input id={id} list="gus" placeholder="예: 마포구" invalid={b} value={v} onChange={(e) => { setBad(false); setV(e.target.value); }} onKeyDown={(e) => e.key === 'Enter' && submit()} />}
          </Field>
          <datalist id="gus">{GUS.map((g) => <option key={g} value={g} />)}</datalist>
          <Button variant="ghost" block onClick={() => setUnk(true)}>모르겠습니다</Button>
        </>
      )}
    </Page>
  );
}

function AskDate({ p, idx }) {
  const nav = useNavigate();
  const { draft } = useApp();
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [date, setDate] = useState(iso);
  const [time, setTime] = useState('');
  const submit = () => {
    const [h, m] = time ? time.split(':').map(Number) : [12, 0];
    const d = parseDay(date);
    d.setHours(h, m, 0, 0);
    draft.set(p.id, { at: d, timed: !!time });
  };
  return (
    <Page title="빠진 정보 입력" right={`사진 ${idx + 1}`} dtitle="새 일기" onBack={() => nav('/create')} step={2} side={sidePhoto(p, idx)} foot={<Button block onClick={submit} disabled={!date}>다음</Button>}>
      <h2 className="v3-h2">이 사진은 언제 찍었나요?</h2>
      <Field label="날짜">{(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
      <Field label="시간 (선택)" hint="시간이 없으면 시간이 있는 사진 뒤에 놓여요">
        {(id) => <Input id={id} type="time" placeholder="예: 14:30" value={time} onChange={(e) => setTime(e.target.value)} />}
      </Field>
    </Page>
  );
}

function Mismatch({ p, idx, day }) {
  const nav = useNavigate();
  const { draft } = useApp();
  const [card, setCard] = useState(null);
  const [pick, input] = useFilePicker((fs) => {
    const f = fs[0];
    if (!OK_TYPES.includes(f.type)) return setCard('UNSUPPORTED_IMAGE_TYPE');
    if (f.size > MAX_BYTES) return setCard('FILE_TOO_LARGE');
    draft.replace(p.id, fromFile(f));
  }, false);
  const when = `${monthDayDot(p.at)} ${clockOf(p.at)}`;
  const [, m, d] = day.split('-');
  return (
    <Page
      title="날짜 확인"
      dtitle="새 일기"
      onBack={() => nav('/create')}
      step={2}
      side={sidePhoto(p, idx)}
      foot={<Button block variant="secondary" disabled>사진을 고치면 넘어갈 수 있어요</Button>}
      overlay={card && <ErrorCard code={card} onClose={() => setCard(null)} />}
    >
      {input}
      <h2 className="v3-h2">다른 날 찍은 사진이 있어요</h2>
      <p className="t-body">일기 한 편에는 같은 날 사진만 담을 수 있어요. 이 일기의 날짜는 {Number(m)}월 {Number(d)}일이에요.</p>
      <div className="v3-prow v3-prow--flat">
        <span className="v3-prow__th"><PhotoImg p={p} raw /></span>
        <span className="v3-prow__t"><b className="t-caption-strong">사진 {idx + 1}</b><span className="t-caption">{when}</span></span>
        <i className="v3-badge v3-badge--bad">날짜가 달라요</i>
      </div>
      <div className="v3-two">
        <Button variant="ghost" block onClick={pick}>사진 교체</Button>
        <Button variant="ghost" block onClick={() => draft.remove(p.id)}>삭제</Button>
      </div>
      <p className="t-caption v3-muted">오전 5시 전에 찍은 사진은 전날로 계산해요. 11월 7일 새벽 3시 사진은 11월 6일 일기에 들어가요.</p>
    </Page>
  );
}

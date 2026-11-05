import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import assets from '../../assetMap.js';
import { Button, StatusBar } from '../../components/common.jsx';
import useDesktop from '../../hooks/useDesktop.js';
import { MAX_BYTES, OK_TYPES, dotDay } from '../data.js';
import { useApp } from '../store.jsx';
import { Confirm, ErrorCard, Field, Input, Page, Toggle, useFilePicker, usePreview } from '../ui.jsx';

export function Avatar({ size = 96, camera, onClick }) {
  const { db } = useApp();
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag type={onClick ? 'button' : undefined} className="v3-avatar" style={{ width: size, height: size }} onClick={onClick} aria-label={onClick ? '프로필 사진 바꾸기' : undefined}>
      {db.avatar ? <img src={db.avatar} alt="" /> : <img className="v3-avatar__def" src={assets.iconUser} alt="" />}
      {camera && <i className="v3-avatar__cam"><img src={assets.iconCamera} alt="" /></i>}
    </Tag>
  );
}

const Row = ({ k, v }) => (
  <div className="v3-kv"><dt className="t-caption v3-muted">{k}</dt><dd className="t-body">{v}</dd></div>
);

/* ─────────── M1 프로필 / M3 설정 (모바일은 탭, 데스크톱은 한 장에 두 쪽) ─────────── */
export default function Me({ initial = 'profile' }) {
  const nav = useNavigate();
  const desk = useDesktop();
  const { auth, diary } = useApp();
  const s = usePreview();
  const [tab, setTab] = useState(initial);
  const [out, setOut] = useState(s === 'logout');
  const me = auth.me;
  const first = diary.entries.length ? diary.entries[diary.entries.length - 1].day : me?.joined;

  const profile = (
    <section className="v3-colophon">
      <p className="t-caption v3-muted">판권 · 내 일기장의 마지막 장</p>
      <Avatar size={96} camera onClick={() => nav('/me/edit')} />
      <dl className="v3-kvs">
        <Row k="지은이" v={me?.nick} />
        <Row k="이메일" v={me?.email} />
        <Row k="처음 쓴 날" v={first ? `${first.slice(0, 4)}년 ${Number(first.slice(5, 7))}월 ${Number(first.slice(8, 10))}일` : '-'} />
        <Row k="쓴 일기" v={`${diary.entries.length}편`} />
        <Row k="펴낸 곳" v="SEOULMATE" />
      </dl>
      <Button block variant="ghost" onClick={() => nav('/me/edit')}>프로필 수정</Button>
    </section>
  );
  const settings = (
    <section className="v3-settings">
      <h2 className="t-heading">설정</h2>
      <p className="t-caption v3-muted">내 계정과 데이터를 관리해요</p>
      <ul className="v3-menu">
        <li><button type="button" onClick={() => nav('/me/info')}>개인정보 관리<img src={assets.iconChevronRight} alt="" /></button></li>
        <li><button type="button" onClick={() => nav('/me/face')}>얼굴 데이터 관리<img src={assets.iconChevronRight} alt="" /></button></li>
        <li><button type="button" onClick={() => nav('/privacy')}>개인정보처리방침<img src={assets.iconChevronRight} alt="" /></button></li>
        <li><button type="button" className="v3-menu__out" onClick={() => setOut(true)}>로그아웃</button></li>
      </ul>
    </section>
  );
  const confirm = out && (
    <Confirm icon="user" title="로그아웃할까요?" body="쓰던 일기는 그대로 남아 있어요." ok="로그아웃" onCancel={() => setOut(false)} onOk={() => { auth.logout(); nav('/start', { replace: true }); }} />
  );

  if (desk) {
    return (
      <Page title="마이페이지" back={null} tab="me" bg="wood" overlay={confirm} wide>
        <div className="v3-spread">
          <div className="v3-spread__l">{profile}</div>
          <div className="v3-spread__r">{settings}</div>
        </div>
      </Page>
    );
  }
  return (
    <Page title="마이페이지" back={null} tab="me" overlay={confirm}>
      <div className="v3-seg" role="tablist">
        {[['profile', '프로필'], ['settings', '설정']].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'profile' ? profile : settings}
    </Page>
  );
}

/* ─────────── M2-1 사진 자르기 (원형 영역으로 확대·이동 후 256px 이미지로 저장) ─────────── */
const VIEW = 260;
function Cropper({ src, onCancel, onDone }) {
  const [z, setZ] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [nat, setNat] = useState(null);
  const drag = useRef(null);
  useEffect(() => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => setNat({ w: im.naturalWidth, h: im.naturalHeight, im });
    im.src = src;
  }, [src]);
  const base = nat ? VIEW / Math.min(nat.w, nat.h) : 1;
  const sc = base * z;
  const clamp = (o, scale = sc) => {
    if (!nat) return o;
    const mx = Math.max(0, (nat.w * scale - VIEW) / 2);
    const my = Math.max(0, (nat.h * scale - VIEW) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  };
  const done = () => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const k = 256 / VIEW;
    const ctx = c.getContext('2d');
    ctx.drawImage(nat.im, (VIEW / 2 + off.x - (nat.w * sc) / 2) * k, (VIEW / 2 + off.y - (nat.h * sc) / 2) * k, nat.w * sc * k, nat.h * sc * k);
    let url;
    try {
      url = c.toDataURL('image/jpeg', 0.88);
    } catch {
      url = src; // 교차 출처 이미지 등으로 캔버스를 읽을 수 없으면 원본을 그대로 쓴다
    }
    onDone(url);
  };
  return (
    <div className="v3-crop" role="dialog" aria-modal="true" aria-label="사진 자르기">
      <StatusBar />
      <div className="v3-crop__bar">
        <button type="button" onClick={onCancel} aria-label="닫기"><img src={assets.iconClose} alt="" style={{ filter: 'invert(1)' }} /></button>
        <b className="t-heading">사진 자르기</b>
        <span />
      </div>
      <p className="t-caption v3-crop__help">손가락으로 움직이고 벌려서 맞춰 주세요</p>
      <div
        className="v3-crop__view"
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX - off.x, y: e.clientY - off.y }; }}
        onPointerMove={(e) => drag.current && setOff(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }))}
        onPointerUp={() => (drag.current = null)}
      >
        {nat && <img src={src} alt="" draggable={false} style={{ width: nat.w * sc, height: nat.h * sc, transform: `translate(calc(-50% + ${off.x}px), calc(-50% + ${off.y}px))` }} />}
      </div>
      <input className="v3-crop__zoom" type="range" min="1" max="3" step="0.01" value={z} aria-label="확대" onChange={(e) => { const nz = Number(e.target.value); setZ(nz); setOff((o) => clamp(o, base * nz)); }} />
      <Button block onClick={done} disabled={!nat}>이 사진으로 정하기</Button>
    </div>
  );
}

/* ─────────── M2 프로필 수정 ─────────── */
export function MeEdit() {
  const nav = useNavigate();
  const { auth, db } = useApp();
  const s = usePreview();
  const [nick, setNick] = useState(auth.me?.nick || '');
  const [av, setAv] = useState(undefined); // undefined 유지 · null 기본 이미지 · 문자열 새 사진
  const [crop, setCrop] = useState(s === 'crop' ? assets.sceneSeongsu : null);
  const [card, setCard] = useState(null);
  const [bad, setBad] = useState(false);
  const [pick, input] = useFilePicker((fs) => {
    const f = fs[0];
    if (!OK_TYPES.includes(f.type)) return setCard('UNSUPPORTED_IMAGE_TYPE');
    if (f.size > MAX_BYTES) return setCard('FILE_TOO_LARGE');
    setCrop(URL.createObjectURL(f));
  }, false);
  const shown = av === undefined ? db.avatar : av;
  const save = () => {
    const n = nick.trim();
    if (n.length < 2 || n.length > 30) return setBad(true);
    auth.updateProfile(n, av);
    nav('/me', { replace: true });
  };
  return (
    <Page title="프로필 수정" right={<button type="button" className="v3-done" onClick={save}>저장</button>} onBack={() => nav('/me')} tab={null} navActive="me" dtitle="프로필 수정" foot={<Button block className="v3-desk-only" onClick={save}>저장</Button>}
      overlay={<>{card && <ErrorCard code={card} onClose={() => setCard(null)} onAction={[() => { setCard(null); pick(); }]} />}{crop && <Cropper src={crop} onCancel={() => setCrop(null)} onDone={(u) => { setAv(u); setCrop(null); }} />}</>}>
      {input}
      <div className="v3-avatar-edit">
        <span className="v3-avatar" style={{ width: 112, height: 112 }}>{shown ? <img src={shown} alt="" /> : <img className="v3-avatar__def" src={assets.iconUser} alt="" />}</span>
        <div className="v3-two">
          <Button small variant="ghost" icon={assets.iconCamera} onClick={pick}>사진 고르기</Button>
          <Button small variant="ghost" onClick={() => setAv(null)}>기본 이미지로</Button>
        </div>
        <p className="t-caption v3-muted">JPEG, PNG, WebP · 10MB 이하</p>
      </div>
      <Field label="닉네임" error={bad ? '닉네임은 2~30자로 적어 주세요.' : null} hint="2~30자 · 다른 사람과 같아도 괜찮아요">
        {(id, b) => <Input id={id} maxLength={30} invalid={b} value={nick} onChange={(e) => { setBad(false); setNick(e.target.value); }} />}
      </Field>
      <Field label="이메일" hint="이메일은 바꿀 수 없어요">{(id) => <Input id={id} value={auth.me?.email || ''} readOnly disabled />}</Field>
    </Page>
  );
}

/* ─────────── M4 개인정보 관리 ─────────── */
export function MeInfo() {
  const nav = useNavigate();
  const { auth } = useApp();
  const me = auth.me;
  return (
    <Page title="개인정보 관리" onBack={() => nav('/me')} tab={null} navActive="me" wide>
      <h3 className="t-body-strong">계정 정보</h3>
      <dl className="v3-kvs v3-kvs--card">
        <Row k="닉네임" v={me?.nick} />
        <Row k="이메일" v={me?.email} />
        <Row k="로그인 방식" v={me?.google ? 'Google' : '이메일'} />
        <Row k="가입일" v={me?.joined ? `${me.joined.slice(0, 4)}년 ${Number(me.joined.slice(5, 7))}월 ${Number(me.joined.slice(8, 10))}일` : '-'} />
      </dl>
      <h3 className="t-body-strong">내 사진과 위치</h3>
      <p className="t-body">사진의 EXIF는 지우고 저장해요. GPS 좌표는 구를 찾은 뒤 저장하지 않아요.</p>
      <Link className="v3-link" to="/privacy">개인정보처리방침 보기</Link>
    </Page>
  );
}

/* ─────────── M5 얼굴 데이터 관리 ─────────── */
export function MeFace() {
  const nav = useNavigate();
  const { face } = useApp();
  const s = usePreview();
  const [del, setDel] = useState(s === 'confirm');
  const [pick, input] = useFilePicker(() => face.set({ registered: true, date: dotDay(new Date().toISOString().slice(0, 10)), on: true }), false);
  const reg = s === 'empty' ? false : face.registered;
  return (
    <Page title="얼굴 데이터 관리" onBack={() => nav('/me')} tab={null} navActive="me" wide
      overlay={del && <Confirm icon="face" title="얼굴 데이터를 삭제할까요?" body="삭제한 데이터는 되돌릴 수 없어요. 이미 저장한 일기의 그림은 그대로 남아요." ok="삭제" onCancel={() => setDel(false)} onOk={() => { face.set({ registered: false }); setDel(false); }} />}>
      {input}
      {reg ? (
        <>
          <div className="v3-card v3-card--row">
            <span className="v3-faceimg"><img src={assets.faceA} alt="" /></span>
            <span><b className="t-body-strong">저장된 얼굴 데이터</b><span className="t-caption v3-muted" style={{ display: 'block' }}>등록일 {face.date}</span></span>
            <i className="v3-badge v3-badge--ok">사용 중</i>
          </div>
          <div className="v3-card v3-card--row">
            <span><b className="t-body-strong">그림 변환에 사용</b><span className="t-caption v3-muted" style={{ display: 'block' }}>끄면 내 얼굴 데이터를 쓰지 않고 그려요</span></span>
            <Toggle on={face.on} onChange={(v) => face.set({ on: v })} label="그림 변환에 사용" />
          </div>
        </>
      ) : (
        <div className="v3-card v3-card--note">
          <span className="notice__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#625548" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M9 10v.5M15 10v.5M8.5 15a5 5 0 0 0 7 0" /></svg></span>
          <b className="t-heading">저장된 얼굴 데이터가 없어요</b>
          <p className="t-body">등록하지 않아도 일기를 만들 수 있어요.</p>
        </div>
      )}
      <h3 className="t-body-strong">이렇게 쓰여요</h3>
      <p className="t-body">그림일기 속 내 모습을 그릴 때만 사용해요. 다른 사용자에게 보이지 않고, 언제든 삭제할 수 있어요.</p>
      <p className="t-caption v3-muted">삭제해도 이미 저장한 일기의 그림은 그대로 남아요.</p>
      <div className="v3-stack">
        {reg ? (
          <>
            <Button block variant="ghost" onClick={pick}>얼굴 데이터 다시 등록</Button>
            <button type="button" className="v3-danger" onClick={() => setDel(true)}>얼굴 데이터 삭제</button>
          </>
        ) : (
          <Button block onClick={pick}>얼굴 데이터 등록</Button>
        )}
      </div>
    </Page>
  );
}

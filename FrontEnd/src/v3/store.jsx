import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SEED_ENTRIES, SEED_FEED, MAX_PHOTOS, logicalDay, GUS, TEXT_MAX } from './data.js';

const KEY = 'seoulmate:v3';
const DEMO_ACCOUNT = { 'user@example.com': { pw: 'password123', nick: '서울산책러', joined: '2026-10-28', verified: true } };

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw) return raw;
  } catch { /* 저장소를 쓸 수 없으면 메모리로만 동작 */ }
  return null;
}
const initial = () => ({
  accounts: DEMO_ACCOUNT,
  session: null, // 로그인한 이메일
  entries: SEED_ENTRIES,
  reactions: {},
  reported: [],
  avatar: null,
  face: { registered: true, date: '2026.10.28', on: true },
  ...(load() || {}),
});

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

let seq = 0;
const uid = (p) => `${p}${Date.now().toString(36)}${seq++}`;

export function AppProvider({ children }) {
  const [db, setDb] = useState(initial);
  const [draft, setDraft] = useState({ photos: [], mode: 'new' });
  const [pending, setPending] = useState(null); // 인증 대기 중인 이메일
  const lastSent = useRef(0);
  const timers = useRef([]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch { /* ignore */ }
  }, [db]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const patch = useCallback((p) => setDb((d) => ({ ...d, ...(typeof p === 'function' ? p(d) : p) })), []);

  /* ───── 계정 ───── */
  const me = db.session ? { email: db.session, ...db.accounts[db.session] } : null;
  const auth = {
    me,
    signup(email, pw, nick) {
      if (db.accounts[email]) return { ok: false, code: 'DUP' };
      patch((d) => ({ accounts: { ...d.accounts, [email]: { pw, nick, joined: logicalDay(new Date()), verified: false } } }));
      setPending(email);
      lastSent.current = Date.now();
      return { ok: true };
    },
    pending,
    /** 6자리 코드 확인. 데모: 000000 은 틀린 코드, 나머지는 통과 */
    verify(code) {
      if (!pending || code === '000000' || code.length !== 6) return false;
      patch((d) => ({ accounts: { ...d.accounts, [pending]: { ...d.accounts[pending], verified: true } }, session: pending }));
      setPending(null);
      return true;
    },
    resend() {
      const left = 60 - Math.floor((Date.now() - lastSent.current) / 1000);
      if (lastSent.current && left > 0) return { ok: false, left };
      lastSent.current = Date.now();
      return { ok: true };
    },
    secondsToResend() {
      return Math.max(0, 60 - Math.floor((Date.now() - lastSent.current) / 1000));
    },
    login(email, pw) {
      const a = db.accounts[email];
      if (!a || a.pw !== pw) return { ok: false, code: 'BAD' };
      if (!a.verified) {
        setPending(email);
        return { ok: false, code: 'EMAIL_NOT_VERIFIED' };
      }
      patch({ session: email });
      return { ok: true };
    },
    google() {
      const email = 'google.user@gmail.com';
      patch((d) => ({ accounts: { ...d.accounts, [email]: d.accounts[email] || { pw: null, nick: '서울산책러', joined: logicalDay(new Date()), verified: true, google: true } }, session: email }));
    },
    logout() {
      patch({ session: null });
    },
    updateProfile(nick, avatar) {
      patch((d) => ({ accounts: { ...d.accounts, [d.session]: { ...d.accounts[d.session], nick } }, avatar: avatar === undefined ? d.avatar : avatar }));
    },
  };

  /* ───── 내 일기 ───── */
  const diary = {
    entries: db.entries,
    get: (id) => db.entries.find((e) => e.id === id),
    add(entry) {
      patch((d) => ({ entries: [entry, ...d.entries] }));
    },
    remove(id) {
      patch((d) => ({ entries: d.entries.filter((e) => e.id !== id) }));
    },
    setVisibility(id, isPublic, vis) {
      patch((d) => ({
        entries: d.entries.map((e) =>
          e.id !== id ? e : { ...e, public: isPublic, pages: e.pages.map((p) => (p.blocked || p.gu === 'unknown' ? p : { ...p, vis: isPublic ? vis[p.id] ?? p.vis : 'private' })) },
        ),
      }));
    },
    setText(id, pageId, text) {
      patch((d) => ({ entries: d.entries.map((e) => (e.id !== id ? e : { ...e, pages: e.pages.map((p) => (p.id === pageId ? { ...p, text } : p)) })) }));
    },
  };

  /* ───── 소셜 ───── */
  const social = {
    react(id, kind) {
      patch((d) => ({ reactions: { ...d.reactions, [id]: d.reactions[id] === kind ? null : kind } }));
    },
    reaction: (id) => db.reactions[id] || null,
    report(id) {
      patch((d) => ({ reported: [...d.reported, id] }));
    },
    isReported: (id) => db.reported.includes(id),
  };

  /* ───── 얼굴 데이터 ───── */
  const face = {
    ...db.face,
    set: (f) => patch((d) => ({ face: { ...d.face, ...f } })),
  };

  /* ───── 새 일기 초안 ───── */
  const upd = useCallback((id, p) => setDraft((d) => ({ ...d, photos: d.photos.map((x) => (x.id === id ? { ...x, ...(typeof p === 'function' ? p(x) : p) } : x)) })), []);
  const later = (fn, ms) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  };

  const mk = (o) => ({
    id: uid('p'),
    url: null, scene: null, at: null, gu: null, name: '',
    conv: 'wait', failConv: false, filter: 0,
    talk: 'none', chat: [], text: '', vis: 'public', ...o,
  });

  const draftApi = {
    photos: draft.photos,
    /** 지정한 사진 만들기 (파일 객체 또는 데모) */
    reset() {
      setDraft({ photos: [] });
    },
    addFiles(items) {
      setDraft((d) => ({ ...d, photos: [...d.photos, ...items.map(mk)].slice(0, MAX_PHOTOS) }));
    },
    replace(id, item) {
      upd(id, { ...mk(item), id, });
    },
    remove(id) {
      setDraft((d) => ({ ...d, photos: d.photos.filter((x) => x.id !== id) }));
    },
    set: upd,
    /** 일기 날짜: 날짜 있는 사진 중 가장 많은 논리적 날짜 (동률이면 먼저 나온 날짜) */
    day() {
      const cnt = new Map();
      draft.photos.forEach((p) => p.at && cnt.set(logicalDay(p.at), (cnt.get(logicalDay(p.at)) || 0) + 1));
      let best = null;
      cnt.forEach((n, k) => {
        if (!best || n > best[1]) best = [k, n];
      });
      return best ? best[0] : logicalDay(new Date());
    },
    /** 정보 입력 단계에서 다음에 채워야 할 것 */
    nextTodo() {
      const day = this.day();
      for (const p of draft.photos) if (!p.gu) return { type: 'gu', p };
      for (const p of draft.photos) if (!p.at) return { type: 'date', p };
      const bad = draft.photos.find((p) => logicalDay(p.at) !== day);
      if (bad) return { type: 'mismatch', p: bad, day };
      return null;
    },
    /** 시간순 정렬 (시간 없는 사진은 시간 있는 사진 뒤) */
    sort() {
      setDraft((d) => ({
        ...d,
        photos: [...d.photos].sort((a, b) => {
          const ta = a.at && a.timed !== false ? a.at.getTime() : Infinity;
          const tb = b.at && b.timed !== false ? b.at.getTime() : Infinity;
          return ta - tb;
        }),
      }));
    },
    /** 그림 변환 시작 (대기 중인 사진만). 데모 4번 사진은 첫 시도에 실패한다. */
    convert(id) {
      upd(id, { conv: 'run' });
      later(() => upd(id, (x) => (x.failConv ? { conv: 'fail', failConv: false } : { conv: 'done' })), 1400 + Math.random() * 1200);
    },
    convertWaiting() {
      draft.photos.filter((p) => p.conv === 'wait').forEach((p) => this.convert(p.id));
    },
    /** 일기 글 생성 (대화 내용 → 글) */
    writeText(id) {
      const p = draft.photos.find((x) => x.id === id);
      const mine = (p?.chat || []).filter((m) => m.r === 'me').map((m) => m.t.trim().replace(/[.!?。]+$/, ''));
      upd(id, { talk: 'writing' });
      later(() => {
        const base = mine.length ? `${mine.join('. ')}.` : '';
        const text = (base.length > 2 ? `오늘은 ${base} 오래 기억에 남을 하루였다.` : '').slice(0, TEXT_MAX);
        upd(id, { talk: 'done', text });
      }, 1600);
    },
    ready() {
      return draft.photos.length > 0 && draft.photos.every((p) => p.talk === 'done' && (p.conv === 'done' || p.conv === 'orig'));
    },
    save(isPublic) {
      const day = this.day();
      const entry = {
        id: uid('e'),
        day,
        public: isPublic,
        pages: draft.photos.map((p) => ({
          id: uid('pg'),
          gu: p.gu === 'unknown' ? '위치 모름' : p.gu,
          unknownGu: p.gu === 'unknown',
          text: p.text,
          url: p.url,
          scene: p.scene,
          original: p.conv === 'orig',
          filter: p.filter,
          vis: isPublic && p.gu !== 'unknown' ? p.vis : 'private',
        })),
      };
      patch((d) => ({ entries: [entry, ...d.entries] }));
      setDraft({ photos: [] });
      return entry;
    },
  };

  const value = useMemo(
    () => ({ db, auth, diary, social, face, draft: draftApi, feed: SEED_FEED, GUS }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, draft, pending],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

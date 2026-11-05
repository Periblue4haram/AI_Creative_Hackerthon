import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ApiError, api, setAuthLostHandler, tokens } from './api.js';
import { KO_REGION, VIS_API, toEntry, toFeedItem, toPage, toSummary } from './adapt.js';
import { GUS, MAX_PHOTOS, dotDay } from './data.js';
import { getGoogleIdToken } from './google.js';

/* 서버에 없는 값(프로필 사진·얼굴 데이터)만 브라우저에 둔다 — 보류사항, README 참고 */
const PENDING_KEY = 'seoulmate:v3:pending';
const DRAFT_KEY = 'seoulmate:v3:draft';
const mkStore = (get) => ({
  get(k) {
    try {
      return JSON.parse(get().getItem(k) || 'null');
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      get().setItem(k, JSON.stringify(v));
    } catch { /* 저장소를 쓸 수 없으면 메모리로만 동작 */ }
  },
  del(k) {
    try {
      get().removeItem(k);
    } catch { /* ignore */ }
  },
});
const ls = mkStore(() => localStorage);
const ss = mkStore(() => sessionStorage);

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

/** 호출 결과를 {ok, data} / {ok:false, code, details} 로 맞춘다. 화면은 try/catch 없이 code 로 분기한다. */
async function run(fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, code: e.code, details: e.details, status: e.status };
    return { ok: false, code: 'INTERNAL_ERROR', details: null };
  }
}

const EMPTY_DRAFT = { diaryId: null, status: null, day: null, photos: [] };
const FACE_EMPTY = { loaded: false, registered: false, date: '', on: false, url: null };
const EMPTY_MINE = { items: [], total: 0, loaded: false };
let seq = 0;

export function AppProvider({ children }) {
  /* ───── 계정 ───── */
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [pend, setPend] = useState(() => ss.get(PENDING_KEY)); // {email, sentAt, expiresAt}

  /* ───── 내 일기 목록 / 새 일기 초안 / 소셜 ───── */
  const [mine, setMine] = useState(EMPTY_MINE);
  const [draft, setDraftState] = useState(EMPTY_DRAFT);
  const dRef = useRef(EMPTY_DRAFT);
  const [reactions, setReactions] = useState({});
  const [reported, setReported] = useState([]);
  const inflight = useRef({});
  const confirming = useRef(null);

  const setD = useCallback((fn) => {
    const next = typeof fn === 'function' ? fn(dRef.current) : fn;
    dRef.current = next;
    setDraftState(next);
  }, []);

  const setPending = (v) => {
    setPend(v);
    if (v) ss.set(PENDING_KEY, v);
    else ss.del(PENDING_KEY);
  };

  const toMe = (r) => ({
    id: r.id,
    email: r.email,
    nick: r.nickname,
    joined: (r.createdAt || '').slice(0, 10),
    avatar: r.profileImageUrl || null,
    loginMethod: r.loginMethod,
    diaryCount: r.diaryCount,
    firstDiary: r.firstDiaryDate || null,
  });

  const loadMe = useCallback(async () => {
    const r = await api.me.get();
    const u = toMe(r);
    setMe(u);
    return u;
  }, []);

  /** 진행 중이던 초안(서버에 남아 있는 일기)을 다시 불러온다 */
  const restoreDraft = useCallback(async () => {
    const id = ls.get(DRAFT_KEY);
    if (!id) return;
    const r = await run(() => api.diary.get(id));
    if (!r.ok || r.data.status === 'COMPLETED') return ls.del(DRAFT_KEY);
    const e = toEntry(r.data);
    setD({ diaryId: e.id, status: e.status, day: e.day, photos: e.pages });
  }, [setD]);

  useEffect(() => {
    setAuthLostHandler(() => {
      setMe(null);
      setFaceData(FACE_EMPTY);
      setD(EMPTY_DRAFT);
      setMine(EMPTY_MINE);
    });
    let alive = true;
    (async () => {
      if (tokens.get()) {
        try {
          await loadMe();
          await restoreDraft();
        } catch { /* 토큰이 만료됐으면 api.js 가 로그아웃 처리한다 */ }
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = async (tk) => {
    tokens.set(tk);
    await loadMe();
    await restoreDraft();
  };

  const auth = {
    me,
    ready,
    /** 인증 코드 입력 대기 중인 이메일 */
    pending: pend?.email || null,
    /** 인증 코드가 만료되기까지 남은 초 */
    secondsToExpire: () => (pend?.expiresAt ? Math.max(0, Math.ceil((pend.expiresAt - Date.now()) / 1000)) : 0),
    secondsToResend: () => (pend?.sentAt ? Math.max(0, 60 - Math.floor((Date.now() - pend.sentAt) / 1000)) : 0),
    async signup(email, password, nickname, privacyAgreed) {
      const r = await run(() => api.auth.signup(email, password, nickname, privacyAgreed === true));
      // 메일 발송이 실패해도 계정은 만들어진다 → 인증 화면에서 다시 보낼 수 있게 둔다
      if (r.ok) setPending({ email: r.data.email, sentAt: Date.now(), expiresAt: Date.now() + r.data.expiresIn * 1000 });
      else if (r.code === 'EMAIL_SEND_FAILED') setPending({ email: email.trim().toLowerCase(), sentAt: Date.now(), expiresAt: 0 });
      return r;
    },
    async verify(code) {
      if (!pend?.email) return { ok: false, code: 'VALIDATION_FAILED' };
      const r = await run(() => api.auth.verify(pend.email, code));
      if (!r.ok) return r;
      const out = await run(() => startSession(r.data));
      if (out.ok) setPending(null);
      return out;
    },
    async resend() {
      if (!pend?.email) return { ok: false, code: 'VALIDATION_FAILED' };
      const r = await run(() => api.auth.resend(pend.email));
      if (r.ok) setPending({ ...pend, sentAt: Date.now(), expiresAt: Date.now() + 600 * 1000 });
      else if (r.code === 'TOO_MANY_REQUESTS' && r.details?.retryAfterSeconds != null) setPending({ ...pend, sentAt: Date.now() - (60 - r.details.retryAfterSeconds) * 1000 });
      return r;
    },
    async login(email, password) {
      const r = await run(() => api.auth.login(email, password));
      if (r.ok) return run(() => startSession(r.data));
      if (r.code === 'EMAIL_NOT_VERIFIED') setPending({ email: email.trim().toLowerCase(), sentAt: 0, expiresAt: 0 });
      return r;
    },
    /** 구글 계정 선택 → ID 토큰 → 서버 로그인 (새 계정이면 서버가 임의 닉네임을 만든다) */
    async google() {
      const idToken = await getGoogleIdToken();
      if (idToken === 'cancel') return { ok: false, code: 'CANCELLED' }; // 사용자가 창을 닫음
      if (!idToken) return { ok: false, code: 'INVALID_GOOGLE_TOKEN' };
      const r = await run(() => api.auth.google(idToken));
      if (!r.ok) return r;
      return run(() => startSession(r.data));
    },
    async logout() {
      const t = tokens.get();
      if (t?.refreshToken) await run(() => api.auth.logout(t.refreshToken));
      tokens.clear();
      ls.del(DRAFT_KEY);
      setMe(null);
      setFaceData(FACE_EMPTY);
      setD(EMPTY_DRAFT);
      setMine(EMPTY_MINE);
      setReactions({});
    },
    async refreshMe() {
      await run(loadMe);
    },
    /** avatar: undefined 유지 · null 기본 이미지로 · Blob 새 사진 */
    async updateProfile(nick, avatar) {
      if (avatar !== undefined) {
        const r = await run(() => (avatar ? api.me.setImage(avatar) : api.me.removeImage()));
        if (!r.ok) return r;
        setMe(toMe(r.data));
      }
      if (me && nick !== me.nick) {
        const r = await run(() => api.me.update(nick));
        if (r.ok) setMe(toMe(r.data));
        return r;
      }
      return { ok: true };
    },
  };

  /* ───── 내 일기 ───── */
  const diary = {
    entries: mine.items,
    total: mine.total,
    loaded: mine.loaded,
    /** 저장한 일기를 최신순으로 모두 불러온다 */
    async load() {
      const items = [];
      let total = 0;
      for (let page = 0; page < 20; page += 1) {
        const r = await run(() => api.me.diaries(page, 50));
        if (!r.ok) return r;
        items.push(...r.data.items.map(toSummary));
        total = r.data.totalElements;
        if (!r.data.hasNext) break;
      }
      setMine({ items, total, loaded: true });
      return { ok: true };
    },
    async fetch(id) {
      const r = await run(() => api.diary.get(id));
      return r.ok ? { ok: true, data: toEntry(r.data) } : r;
    },
    async remove(id) {
      const r = await run(() => api.diary.remove(id));
      if (r.ok) setMine((m) => ({ ...m, items: m.items.filter((e) => String(e.id) !== String(id)), total: Math.max(0, m.total - 1) }));
      return r;
    },
    /** vis: { [pageId]: 'public' | 'text' | 'private' } */
    async setVisibility(id, isPublic, vis) {
      const body = { visibility: isPublic ? 'PUBLIC' : 'PRIVATE', pages: Object.entries(vis).map(([pid, v]) => ({ id: Number(pid), visibility: VIS_API[v] })) };
      const r = await run(() => api.diary.update(id, body));
      if (r.ok) setMine((m) => ({ ...m, items: m.items.map((e) => (String(e.id) === String(id) ? { ...e, public: isPublic } : e)) }));
      return r;
    },
    async setText(pageId, text) {
      const r = await run(() => api.page.update(pageId, { content: text }));
      return r.ok ? { ok: true, data: toPage(r.data) } : r;
    },
  };

  /* ───── 소셜 ───── */
  const seed = (items) =>
    setReactions((m) => {
      const n = { ...m };
      items.forEach((i) => {
        n[i.id] = i.myReaction;
      });
      return n;
    });
  const social = {
    async feed(gu, page = 0) {
      const r = await run(() => api.community.feed(gu ? KO_REGION[gu] : undefined, page, 20));
      if (!r.ok) return r;
      const items = r.data.items.flatMap((d) => d.pages.map((p) => toFeedItem(p, d.author, me?.nick)));
      seed(items);
      return { ok: true, items, hasNext: r.data.hasNext };
    },
    async detail(id, gu) {
      const r = await run(() => api.community.detail(id, gu ? KO_REGION[gu] : undefined));
      if (!r.ok) return r;
      const pages = r.data.pages.map((p) => toFeedItem(p, r.data.author, me?.nick));
      seed(pages);
      return { ok: true, data: { nick: r.data.author.nickname, day: r.data.logicalDate, gu: pages[0]?.gu, pages, mine: pages[0]?.mine } };
    },
    async search(q, gu) {
      const r = await run(() => api.community.search(q, gu ? KO_REGION[gu] : undefined, 20));
      if (!r.ok) return r;
      const items = r.data.items.map((i) => toFeedItem(i.page, i.author, me?.nick));
      seed(items);
      return { ok: true, items };
    },
    /** 같은 반응을 다시 누르면 취소한다 */
    async react(id, kind) {
      const cur = reactions[id] || null;
      const next = cur === kind ? null : kind;
      setReactions((m) => ({ ...m, [id]: next }));
      const r = await run(() => (next ? api.community.react(id, next.toUpperCase()) : api.community.unreact(id)));
      if (!r.ok) setReactions((m) => ({ ...m, [id]: cur }));
      return r;
    },
    reaction: (id) => reactions[id] || null,
    async report(id, reason, detail) {
      const r = await run(() => api.community.report(id, reason, detail));
      if (r.ok || r.code === 'ALREADY_REPORTED') setReported((x) => [...x, id]);
      return r;
    },
    isReported: (id) => reported.includes(id),
  };

  /* ───── 얼굴 데이터 ───── */
  const [faceData, setFaceData] = useState(FACE_EMPTY);
  const putFace = (d) => setFaceData({ loaded: true, registered: !!d.registered, date: d.registeredAt ? dotDay(d.registeredAt.slice(0, 10)) : '', on: !!d.enabled, url: d.imageUrl || null });
  const face = {
    ...faceData,
    async load() {
      const r = await run(() => api.me.face());
      if (r.ok) putFace(r.data);
      return r;
    },
    async register(file) {
      const r = await run(() => api.me.registerFace(file));
      if (r.ok) putFace(r.data);
      return r;
    },
    async toggle(on) {
      const r = await run(() => api.me.useFace(on));
      if (r.ok) putFace(r.data);
      return r;
    },
    async remove() {
      const r = await run(() => api.me.removeFace());
      if (r.ok) putFace({ registered: false });
      return r;
    },
  };

  /* ───── 새 일기 초안 ───── */
  const setPage = useCallback((id, p) => setD((d) => ({ ...d, photos: d.photos.map((x) => (x.id === id ? { ...x, ...(typeof p === 'function' ? p(x) : p) } : x)) })), [setD]);
  const applyPage = (op) => setD((d) => ({ ...d, photos: d.photos.map((x) => (x.id === op.id ? toPage(op, x) : x)) }));
  const applyDiary = (od) => {
    const e = toEntry(od, dRef.current.photos);
    ls.set(DRAFT_KEY, e.id);
    setD({ diaryId: e.id, status: e.status, day: e.day, photos: e.pages });
    return e;
  };
  const pageById = (id) => dRef.current.photos.find((x) => x.id === id);

  const draftApi = {
    photos: draft.photos,
    diaryId: draft.diaryId,
    status: draft.status,
    reset() {
      ls.del(DRAFT_KEY);
      setD(EMPTY_DRAFT);
    },
    /** 서버에 만든 초안을 버린다 */
    async discard() {
      const id = dRef.current.diaryId;
      if (id) await run(() => api.diary.remove(id));
      ls.del(DRAFT_KEY);
      setD(EMPTY_DRAFT);
      return { ok: true };
    },

    /** C1: 업로드 전에는 브라우저에 모아 두고, 이미 올렸다면(METADATA_PENDING) 바로 페이지로 추가한다 */
    async addFiles(files) {
      if (!dRef.current.diaryId) {
        const items = files.map((f) => ({ id: `L${(seq += 1)}`, local: true, file: f, url: URL.createObjectURL(f), name: f.name, issues: [], conv: 'run', talk: 'none', chat: [], text: '', vis: 'public' }));
        setD((d) => ({ ...d, photos: [...d.photos, ...items].slice(0, MAX_PHOTOS) }));
        return { ok: true };
      }
      for (const f of files) {
        const r = await run(() => api.diary.addPage(dRef.current.diaryId, f));
        if (!r.ok) return r;
        setD((d) => ({ ...d, photos: [...d.photos, toPage(r.data)] }));
      }
      return { ok: true };
    },
    async replace(id, file) {
      const cur = pageById(id);
      if (cur?.local) {
        setPage(id, { file, url: URL.createObjectURL(file), name: file.name });
        return { ok: true };
      }
      const r = await run(() => api.page.replacePhoto(id, file));
      if (r.ok) {
        await draftApi.refresh(); // 날짜가 바뀌면 다른 사진의 날짜 불일치 판정도 달라진다
        setPage(id, { chat: [], chatLoaded: false, error: null }); // 서버가 대화와 글을 초기화한다
      }
      return r;
    },
    async remove(id) {
      const cur = pageById(id);
      if (cur?.local) {
        setD((d) => ({ ...d, photos: d.photos.filter((x) => x.id !== id) }));
        return { ok: true };
      }
      if (dRef.current.photos.length <= 1) return draftApi.discard(); // 마지막 한 장은 일기째 버린다
      const r = await run(() => api.page.remove(id));
      if (r.ok) {
        setD((d) => ({ ...d, photos: d.photos.filter((x) => x.id !== id) }));
        await draftApi.refresh();
      }
      return r;
    },
    /** C1 → C2: 사진을 올려 초안을 만든다. 서버가 EXIF 의 날짜·위치를 읽고 빠진 것을 알려 준다. */
    async upload() {
      const files = dRef.current.photos.map((p) => p.file).filter(Boolean);
      const r = await run(() => api.diary.create(files));
      if (r.ok) applyDiary(r.data);
      return r;
    },

    /** 일기 날짜: 사진들 중 가장 많은 논리 날짜 (동률이면 이른 날짜). 서버 기준과 같다. */
    majorityDay() {
      const cnt = new Map();
      dRef.current.photos.forEach((p) => p.day && cnt.set(p.day, (cnt.get(p.day) || 0) + 1));
      let best = null;
      cnt.forEach((n, k) => {
        if (!best || n > best[1] || (n === best[1] && k < best[0])) best = [k, n];
      });
      return best?.[0] || null;
    },
    day() {
      return draft.day || this.majorityDay();
    },
    /** 정보 입력 단계에서 다음에 채워야 할 것 (서버가 알려 준 metadataIssues 기준) */
    nextTodo() {
      const has = (p, k) => p.issues?.includes(k);
      for (const p of draft.photos) if (has(p, 'LOCATION_REQUIRED')) return { type: 'gu', p };
      for (const p of draft.photos) if (has(p, 'DATE_REQUIRED')) return { type: 'date', p };
      const bad = draft.photos.find((p) => has(p, 'DATE_MISMATCH'));
      if (bad) return { type: 'mismatch', p: bad, day: draft.day || this.majorityDay() };
      return null;
    },
    /** 위치/날짜 입력: body = { location:{district}|{unknown:true} } 또는 { date, time? } */
    async setMeta(id, body) {
      const r = await run(() => api.page.metadata(id, body));
      if (r.ok) {
        applyPage(r.data);
        // 한 장이 바뀌면 다른 사진의 날짜 불일치 판정도 달라질 수 있어 일기를 다시 읽는다
        const again = await run(() => api.diary.get(dRef.current.diaryId));
        if (again.ok) applyDiary(again.data);
      }
      return r;
    },
    /** 사진 정보를 확정한다 → 정렬·그림 변환 시작 */
    confirm() {
      if (!confirming.current) {
        confirming.current = run(() => api.diary.confirm(dRef.current.diaryId))
          .then((r) => {
            if (r.ok) applyDiary(r.data);
            return r;
          })
          .finally(() => {
            confirming.current = null;
          });
      }
      return confirming.current;
    },
    /** 변환 상태를 다시 읽는다 (변환 중이면 3초마다 불러온다) */
    async refresh() {
      const id = dRef.current.diaryId;
      if (!id) return { ok: false, code: 'NOT_FOUND' };
      const r = await run(() => api.diary.get(id));
      if (r.ok) applyDiary(r.data);
      return r;
    },
    async regenerate(id) {
      const r = await run(() => api.page.regenerate(id));
      if (r.ok) applyPage(r.data);
      return r;
    },
    async useOriginal(id) {
      const r = await run(() => api.page.useOriginal(id));
      if (r.ok) applyPage(r.data);
      return r;
    },

    /** C6: 대화 열기. 처음이면 첫 질문을 받아 오고, 아니면 지난 대화를 불러온다. */
    openChat(id) {
      const p = pageById(id);
      if (!p || p.chatLoaded) return Promise.resolve({ ok: true });
      if (!inflight.current[id]) {
        const job = (p.talk === 'none' ? run(() => api.page.chatStart(id)) : run(() => api.page.chatHistory(id)))
          .then((r) => {
            if (!r.ok) return r;
            const items = r.data.items || [r.data.message];
            setPage(id, (x) => ({
              chatLoaded: true,
              chat: items.map((m) => ({ r: m.role === 'USER' ? 'me' : 'ai', t: m.content })),
              talk: x.talk === 'none' ? 'ing' : x.talk,
              chars: r.data.estimatedChars,
              hint: r.data.estimatedChars >= 500 && !r.data.limitReached,
              limit: r.data.limitReached,
            }));
            return r;
          })
          .finally(() => {
            delete inflight.current[id];
          });
        inflight.current[id] = job;
      }
      return inflight.current[id];
    },
    async sendChat(id, text) {
      const r = await run(() => api.page.chatSend(id, text));
      if (r.ok) {
        setPage(id, (x) => ({
          chat: [...x.chat, { r: 'me', t: text }, { r: 'ai', t: r.data.message.content }],
          talk: 'ing',
          chars: r.data.estimatedChars,
          hint: r.data.finishSuggested && !r.data.limitReached,
          limit: r.data.limitReached,
        }));
      }
      return r;
    },
    /** C7: 대화로 일기 글 만들기. 실패하면 page.error 에 코드가 남는다. */
    async writeText(id) {
      setPage(id, { talk: 'writing', error: null });
      const r = await run(() => api.page.generateText(id));
      if (r.ok) setPage(id, (x) => ({ ...toPage(r.data, x), talk: 'done', error: null }));
      else setPage(id, { talk: 'ing', error: r.code });
      return r;
    },
    /** 미리보기·글 수정 */
    async setText(id, text) {
      const r = await run(() => api.page.update(id, { content: text }));
      if (r.ok) applyPage(r.data);
      return r;
    },
    ready() {
      return draft.photos.length > 0 && draft.photos.every((p) => p.talk === 'done' && (p.conv === 'done' || p.conv === 'orig'));
    },
    set: setPage,
    /** C10: 공개 범위와 함께 저장. vis: { [pageId]: 'public' | 'text' | 'private' } */
    async save(isPublic, vis) {
      const body = {
        visibility: isPublic ? 'PUBLIC' : 'PRIVATE',
        pages: dRef.current.photos.map((p) => ({ id: p.id, visibility: VIS_API[vis[p.id] ?? 'private'] })),
      };
      const r = await run(() => api.diary.complete(dRef.current.diaryId, body));
      if (!r.ok) return r;
      ls.del(DRAFT_KEY);
      setD(EMPTY_DRAFT);
      setMine((m) => ({ ...m, loaded: false }));
      return { ok: true, id: r.data.id };
    },
  };

  // 변환 중인 페이지가 있으면 3초마다 상태를 확인한다
  const polling = !!draft.diaryId && draft.status === 'CREATING' && draft.photos.some((p) => p.conv === 'run');
  useEffect(() => {
    if (!polling) return undefined;
    const t = setInterval(() => draftApi.refresh(), 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, draft.diaryId]);

  const value = { db: { avatar: me?.avatar || null }, auth, diary, social, face, draft: draftApi, GUS };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

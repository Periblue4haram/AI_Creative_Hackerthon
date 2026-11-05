// SEOUL MATE v3 — 백엔드 REST 클라이언트 (계약: .scratch/ai-diary/api-spec.md)
// - 기본 주소는 '/api/v1' 이고 개발 서버(vite)가 8080 으로 프록시한다 (vite.config.js).
// - /auth/** 와 /images/** 는 토큰 없이 부른다. 그 밖에는 Bearer 토큰을 붙이고 401 이면 한 번 재발급해서 다시 보낸다.
// - 실패하면 ApiError(status, code, message, details) 를 던진다. 화면은 message 가 아니라 code 로 분기한다.

const BASE = (import.meta.env.VITE_API_BASE || '/api/v1').replace(/\/$/, '');
const KEY = 'seoulmate:tokens';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || `HTTP ${status}`);
    this.status = status;
    // 본문 없는 502/503/504·프록시 500은 서버에 닿지 못한 것(백엔드 꺼짐 등)이다
    this.code = body?.code || (status === 0 || (!body && status >= 500) ? 'NETWORK_ERROR' : 'INTERNAL_ERROR');
    this.details = body?.details || null;
  }
}

/* ───── 토큰 저장 ───── */
export const tokens = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || 'null');
    } catch {
      return null;
    }
  },
  set(t) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ accessToken: t.accessToken, refreshToken: t.refreshToken }));
    } catch { /* 저장소를 쓸 수 없으면 새로고침 때 로그아웃된다 */ }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch { /* ignore */ }
  },
};

let onAuthLost = () => {};
/** 재발급까지 실패해 로그인이 풀렸을 때 부를 함수를 등록한다 (store 가 등록) */
export const setAuthLostHandler = (fn) => {
  onAuthLost = fn;
};

const isPublic = (path) => path.startsWith('/auth/');

async function send(path, { method = 'GET', json, form, query, token }) {
  const qs = query
    ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString()}`
    : '';
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (form) body = form;
  else if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  let res;
  try {
    res = await fetch(`${BASE}${path}${qs}`, { method, headers, body });
  } catch {
    throw new ApiError(0, null);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch { /* JSON 이 아닌 응답 */ }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

let refreshing = null;
/** 리프레시 토큰으로 새 토큰 쌍을 받는다. 동시에 여러 요청이 401 이어도 한 번만 보낸다. */
function refresh() {
  if (!refreshing) {
    const t = tokens.get();
    refreshing = (t?.refreshToken
      ? send('/auth/refresh', { method: 'POST', json: { refreshToken: t.refreshToken } })
      : Promise.reject(new ApiError(401, { code: 'INVALID_REFRESH_TOKEN' }))
    )
      .then((r) => {
        tokens.set(r);
        return r.accessToken;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function call(path, opt = {}) {
  if (isPublic(path)) return send(path, opt);
  const t = tokens.get();
  try {
    return await send(path, { ...opt, token: t?.accessToken });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401 || !t?.refreshToken) {
      if (e instanceof ApiError && e.status === 401) {
        tokens.clear();
        onAuthLost();
      }
      throw e;
    }
    let fresh;
    try {
      fresh = await refresh();
    } catch (re) {
      if (re instanceof ApiError && re.status === 401) {
        tokens.clear();
        onAuthLost();
      }
      throw e;
    }
    return send(path, { ...opt, token: fresh });
  }
}

const post = (path, json) => call(path, { method: 'POST', json });
const patch = (path, json) => call(path, { method: 'PATCH', json });
const put = (path, json) => call(path, { method: 'PUT', json });
const del = (path) => call(path, { method: 'DELETE' });
const get = (path, query) => call(path, { query });
const upload = (path, field, files, method = 'POST') => {
  const form = new FormData();
  [].concat(files).forEach((f) => form.append(field, f, f.name));
  return call(path, { method, form });
};

export const api = {
  auth: {
    signup: (email, password, nickname, privacyAgreed) => post('/auth/signup', { email, password, nickname, privacyAgreed }),
    verify: (email, code) => post('/auth/email/verify', { email, code }),
    resend: (email) => post('/auth/email/resend', { email }),
    login: (email, password) => post('/auth/login', { email, password }),
    google: (idToken) => post('/auth/google', { idToken }),
    logout: (refreshToken) => post('/auth/logout', { refreshToken }),
  },
  me: {
    get: () => get('/me'),
    update: (nickname) => patch('/me', { nickname }),
    setImage: (file) => upload('/me/profile-image', 'image', file, 'PUT'),
    removeImage: () => del('/me/profile-image'),
    face: () => get('/me/face-data'),
    registerFace: (file) => upload('/me/face-data', 'image', file),
    useFace: (enabled) => patch('/me/face-data', { enabled }),
    removeFace: () => del('/me/face-data'),
    diaries: (page = 0, size = 50) => get('/me/diaries', { page, size }),
  },
  diary: {
    create: (files) => upload('/diaries', 'photos', files),
    get: (id) => get(`/diaries/${id}`),
    update: (id, body) => patch(`/diaries/${id}`, body),
    remove: (id) => del(`/diaries/${id}`),
    addPage: (id, file) => upload(`/diaries/${id}/pages`, 'photo', file),
    confirm: (id) => post(`/diaries/${id}/confirm`),
    complete: (id, body) => post(`/diaries/${id}/complete`, body),
  },
  page: {
    metadata: (id, body) => patch(`/diary-pages/${id}/metadata`, body),
    replacePhoto: (id, file) => upload(`/diary-pages/${id}/photo`, 'photo', file, 'PUT'),
    update: (id, body) => patch(`/diary-pages/${id}`, body),
    remove: (id) => del(`/diary-pages/${id}`),
    regenerate: (id) => post(`/diary-pages/${id}/image/regenerate`),
    useOriginal: (id) => post(`/diary-pages/${id}/image/use-original`),
    chatStart: (id) => post(`/diary-pages/${id}/chat/start`),
    chatHistory: (id) => get(`/diary-pages/${id}/chat/messages`),
    chatSend: (id, content) => post(`/diary-pages/${id}/chat/messages`, { content }),
    generateText: (id) => post(`/diary-pages/${id}/text/generate`),
  },
  community: {
    feed: (region, page = 0, size = 20) => get('/community/diaries', { region, page, size }),
    detail: (id, region) => get(`/community/diaries/${id}`, { region }),
    search: (q, region, limit = 20) => get('/community/search', { q, region, limit }),
    react: (pageId, type) => put(`/community/pages/${pageId}/reaction`, { type }),
    unreact: (pageId) => del(`/community/pages/${pageId}/reaction`),
    report: (pageId, reason, detail) => post(`/community/pages/${pageId}/reports`, { reason, ...(detail ? { detail } : {}) }),
  },
};

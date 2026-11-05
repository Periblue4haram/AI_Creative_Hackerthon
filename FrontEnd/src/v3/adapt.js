// 서버 응답(api-spec.md) ↔ 화면이 쓰는 모양 변환

export const REGION_KO = { MAPO: '마포구', JONGNO: '종로구', JUNG: '중구', GANGNAM: '강남구', SEODAEMUN: '서대문구' };
export const KO_REGION = Object.fromEntries(Object.entries(REGION_KO).map(([k, v]) => [v, k]));

/** 서버 공개 범위 ↔ 화면 값 (공개 / 글만 / 비공개) */
export const VIS_UI = { PUBLIC: 'public', PHOTO_HIDDEN: 'text', PRIVATE: 'private' };
export const VIS_API = { public: 'PUBLIC', text: 'PHOTO_HIDDEN', private: 'PRIVATE' };

/** 신고 사유 (data.js REPORT_REASONS 와 같은 순서) */
export const REPORT_CODES = ['SPAM', 'INAPPROPRIATE', 'PRIVACY', 'OTHER'];

export const dayOf = (iso) => (iso ? iso.slice(0, 10) : null);

/** OwnerPage → 화면용 페이지. 서버가 모르는 화면 상태(chat, 글 생성 중)는 prev 에서 이어받는다. */
export function toPage(p, prev = {}) {
  const status = p.imageStatus;
  const conv = status === 'FAILED' ? 'fail' : status === 'DONE' ? (p.imageSource === 'ORIGINAL' ? 'orig' : 'done') : 'run';
  const shown = p.imageSource === 'ORIGINAL' || !p.convertedImageUrl ? p.originalImageUrl : p.convertedImageUrl;
  const talk = prev.talk === 'writing' && p.chatStatus !== 'COMPLETED' ? 'writing' : { NOT_STARTED: 'none', IN_PROGRESS: 'ing', COMPLETED: 'done' }[p.chatStatus] || 'none';
  return {
    real: true,
    id: p.id,
    sortOrder: p.sortOrder,
    url: shown,
    rawUrl: p.originalImageUrl,
    at: p.takenAt ? new Date(p.takenAt) : null,
    timed: !!p.takenAt,
    day: p.logicalDate,
    gu: p.region ? REGION_KO[p.region] : p.locationSource === 'UNKNOWN' ? 'unknown' : null,
    issues: p.metadataIssues || [],
    conv,
    imageError: p.imageError,
    talk,
    chars: p.estimatedChars || 0,
    hint: (p.estimatedChars || 0) >= 500 && (p.estimatedChars || 0) < 800,
    limit: (p.estimatedChars || 0) >= 800,
    chat: prev.chat || [],
    chatLoaded: prev.chatLoaded || false,
    text: p.content || '',
    vis: VIS_UI[p.visibility] || 'private',
    shareable: p.shareable,
    blocked: p.reportBlocked,
  };
}

/** OwnerDiary → 화면용 일기 (prevPages: 이미 들고 있는 페이지, 화면 상태를 이어받는다) */
export function toEntry(d, prevPages = []) {
  const prev = new Map(prevPages.map((x) => [x.id, x]));
  return {
    id: d.id,
    status: d.status,
    day: d.logicalDate,
    public: d.visibility === 'PUBLIC',
    templateId: d.templateId,
    pages: d.pages.map((p) => toPage(p, prev.get(p.id))),
  };
}

/** DiarySummary → 목록 한 줄 */
export function toSummary(s) {
  return {
    id: s.id,
    day: s.logicalDate,
    public: s.visibility === 'PUBLIC',
    count: s.pageCount,
    gu: (s.regions || []).map((r) => REGION_KO[r]).join(' · '),
    thumb: s.thumbnailUrl,
    preview: s.preview || '',
  };
}

/** 커뮤니티 PublicPage → 피드 카드 한 장 */
export function toFeedItem(page, author, myNick) {
  return {
    id: page.id,
    diary: page.diaryId,
    nick: author.nickname,
    day: page.logicalDate,
    gu: REGION_KO[page.region],
    text: page.content,
    url: page.photoHidden ? null : page.imageUrl,
    real: true,
    original: page.imageSource === 'ORIGINAL',
    vis: page.photoHidden ? 'text' : 'public',
    myReaction: page.myReaction ? page.myReaction.toLowerCase() : null,
    mine: false, // 닉네임이 중복될 수 있어 작성자를 닉네임으로 가릴 수 없다 (서버가 내 글 표시를 주면 연결)
  };
}

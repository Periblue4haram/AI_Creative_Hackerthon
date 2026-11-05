// SEOUL MATE v3 — 목업 데이터와 문구. 백엔드 연동 전까지 화면을 채운다.

/** 서비스 지역 (v3: 5개 구) */
export const GUS = ['마포구', '종로구', '중구', '강남구', '서대문구'];
export const MAX_PHOTOS = 4;
export const MAX_BYTES = 10 * 1024 * 1024;
export const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** 이 글자 수(사용자 답변 합계)를 넘으면 마무리 안내 / 입력 마감 */
export const CHAT_HINT = 500;
export const CHAT_MAX = 800;
export const TEXT_MAX = 800;
/** 하루는 새벽 5시에 바뀐다 */
export const DAY_START_HOUR = 5;

const pad = (n) => String(n).padStart(2, '0');
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const DOW_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** 새벽 5시 전에 찍은 사진은 전날로 계산한 "논리적 날짜" (YYYY-MM-DD) */
export function logicalDay(d) {
  const x = new Date(d.getTime() - DAY_START_HOUR * 3600 * 1000);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}
export const parseDay = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const dotDay = (s) => s.replaceAll('-', '.'); // 2026.11.04
export const shortDay = (s) => `${Number(s.slice(5, 7))}.${Number(s.slice(8, 10))}`; // 11.4
export const mdDay = (s) => `${s.slice(5, 7)}.${s.slice(8, 10)}`; // 11.04
export const dowDay = (s) => DOW[parseDay(s).getDay()];
export const longDay = (s) => `${dotDay(s)} (${DOW_EN[parseDay(s).getDay()]})`; // 2026.11.04 (WED)
export const clockOf = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const monthDayDot = (d) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

/** 공개 범위 */
export const VIS = { public: '공개', text: '글만', private: '비공개' };
export const SCENES = ['sceneSeongsu', 'sceneHanRiver', 'sceneGyeongbok'];

const T1 =
  '오늘은 연남동 골목을 천천히 걸었다. 붉은 벽돌 건물 1층 카페에서 라테를 마시며 소설을 읽었는데, 창밖으로 오후 햇살이 길게 들어와 펼친 책 위가 따뜻하게 물들었다.';
const T2 =
  '비가 그친 뒤 돌담길을 따라 걸었다. 젖은 돌에서 나는 냄새가 좋아서 일부러 천천히 걸었고, 처마 아래에서 한참 하늘을 올려다봤다.';
const T3 = '처음 쓰는 일기. 퇴근길에 본 노을이 오래 남아서 한참을 서 있었다.';

/** 내 일기 (최신순). 첫 일기의 2번째 페이지는 신고로 차단된 상태 */
export const SEED_ENTRIES = [
  {
    id: 'e3', day: '2026-11-04', public: true,
    pages: [
      { id: 'e3p1', gu: '마포구', text: T1, scene: 'sceneSeongsu', vis: 'public' },
      { id: 'e3p2', gu: '마포구', text: T2, scene: 'sceneGyeongbok', vis: 'private', blocked: true },
      { id: 'e3p3', gu: '마포구', text: '저녁에는 망원동 한강공원에 앉아 노을을 기다렸다. 바람이 선선했다.', scene: 'sceneHanRiver', vis: 'text' },
    ],
  },
  {
    id: 'e2', day: '2026-11-02', public: true,
    pages: [
      { id: 'e2p1', gu: '종로구', text: T2, scene: 'sceneGyeongbok', vis: 'public' },
      { id: 'e2p2', gu: '종로구', text: '익선동 한옥 골목에서 따뜻한 차를 마셨다. 창밖으로 지붕 위 빗방울이 맺혀 있었다.', scene: 'sceneSeongsu', vis: 'public' },
    ],
  },
  {
    id: 'e1', day: '2026-10-28', public: false,
    pages: [{ id: 'e1p1', gu: '서대문구', text: T3, scene: 'sceneHanRiver', vis: 'private' }],
  },
];

/** 소셜 다이어리 피드 (다른 사람 일기). 좋아요·싫어요 수는 절대 보이지 않는다. */
export const SEED_FEED = [
  { id: 'f1', nick: '서울산책러', day: '2026-11-06', gu: '마포구', text: T1, scene: 'sceneSeongsu', vis: 'public', diary: 'd1', mine: false },
  { id: 'f2', nick: '여행자204518', day: '2026-11-06', gu: '마포구', text: '오랜만에 혼자 걷는 망원 시장. 사람 사이를 천천히 걷는 것만으로 마음이 놓였다.', vis: 'text', diary: 'd2', mine: false },
  { id: 'f3', nick: '돌담길산책', day: '2026-11-02', gu: '종로구', text: T2, scene: 'sceneGyeongbok', vis: 'public', diary: 'd3', mine: false },
  { id: 'f4', nick: '여행자204518', day: '2026-10-30', gu: '서대문구', text: '우산을 접고 처마 밑에서 비 냄새를 맡았다.', vis: 'text', diary: 'd2', mine: false },
  { id: 'f5', nick: '명동러', day: '2026-11-03', gu: '중구', text: '명동 골목 끝 작은 서점에서 엽서를 샀다. 계산대 아저씨가 건넨 한마디가 오래 남았다.', scene: 'sceneSeongsu', vis: 'public', diary: 'd4', mine: false },
  { id: 'f6', nick: '강남토박이', day: '2026-11-01', gu: '강남구', text: '선정릉 가을 숲길을 걸었다. 노란 잎이 바닥에 두껍게 쌓여 있었다.', scene: 'sceneHanRiver', vis: 'public', diary: 'd5', mine: false },
  { id: 'f7', nick: '서울산책러', day: '2026-11-04', gu: '마포구', text: T1, scene: 'sceneSeongsu', vis: 'public', diary: 'e3', mine: true },
];
/** 일기 상세(S3)에 시간순으로 보여 줄 같은 작성자의 페이지들 */
export const SEED_DIARIES = {
  d1: { nick: '서울산책러', day: '2026-11-06', gu: '마포구', pages: [
    { id: 'd1p1', text: T1, scene: 'sceneSeongsu', vis: 'public' },
    { id: 'd1p2', text: T2, scene: 'sceneGyeongbok', vis: 'public' },
  ] },
  d2: { nick: '여행자204518', day: '2026-11-06', gu: '마포구', pages: [
    { id: 'd2p1', text: '오랜만에 혼자 걷는 망원 시장. 사람 사이를 천천히 걷는 것만으로 마음이 놓였다.', vis: 'text' },
  ] },
  d3: { nick: '돌담길산책', day: '2026-11-02', gu: '종로구', pages: [{ id: 'd3p1', text: T2, scene: 'sceneGyeongbok', vis: 'public' }] },
  d4: { nick: '명동러', day: '2026-11-03', gu: '중구', pages: [{ id: 'd4p1', text: '명동 골목 끝 작은 서점에서 엽서를 샀다. 계산대 아저씨가 건넨 한마디가 오래 남았다.', scene: 'sceneSeongsu', vis: 'public' }] },
  d5: { nick: '강남토박이', day: '2026-11-01', gu: '강남구', pages: [{ id: 'd5p1', text: '선정릉 가을 숲길을 걸었다. 노란 잎이 바닥에 두껍게 쌓여 있었다.', scene: 'sceneHanRiver', vis: 'public' }] },
};

/** 챗봇 질문 흐름 (사진마다) */
export const CHAT_FIRST = '사진 속 장면이 인상적이에요. 이곳에서 무엇을 하셨나요?';
export const CHAT_NEXT = [
  '그 장면에서 가장 기억에 남는 순간은 언제였나요?',
  '그때 기분은 어땠나요?',
  '함께한 사람이나 마주친 풍경이 있었나요?',
  '오늘 이 장면을 한 줄로 남긴다면요?',
  '더 들려주고 싶은 이야기가 있나요?',
];

/** 에러 카드 16종 (API 에러 코드 → 문구) */
export const ERRORS = {
  EMAIL_SEND_FAILED: { icon: 'alert', title: '인증 메일을 보내지 못했어요', body: '계정은 만들어졌어요. 잠시 뒤 다시 보내 주세요.', actions: ['다시 보내기'] },
  TOO_MANY_REQUESTS: { icon: 'refresh', title: '조금만 기다려 주세요', body: '인증 메일은 60초에 한 번만 보낼 수 있어요. 48초 남았어요.', actions: ['확인'] },
  EMAIL_NOT_VERIFIED: { icon: 'user', title: '이메일 인증이 필요해요', body: '인증을 마치면 로그인할 수 있어요.', actions: ['인증 코드 입력'] },
  INVALID_GOOGLE_TOKEN: { icon: 'user', title: 'Google로 로그인하지 못했어요', body: '다시 시도하거나 이메일로 로그인해 주세요.', actions: ['다시 시도', '이메일로'] },
  PAGE_LIMIT_EXCEEDED: { icon: 'alert', title: '사진은 4장까지 담을 수 있어요', body: '일기 한 편에 1~4장을 넣을 수 있어요.', actions: ['사진 다시 고르기'] },
  FILE_TOO_LARGE: { icon: 'alert', title: '사진이 너무 커요', body: '장당 10MB 이하 사진만 올릴 수 있어요.', actions: ['다른 사진 고르기'] },
  UNSUPPORTED_IMAGE_TYPE: { icon: 'alert', title: '올릴 수 없는 형식이에요', body: 'JPEG, PNG, WebP 사진만 올릴 수 있어요.', actions: ['다른 사진 고르기'] },
  AI_UNAVAILABLE: { icon: 'chat', title: '답을 받지 못했어요', body: '쓰던 답변은 입력창에 남겨 두었어요. 그대로 다시 보낼 수 있어요.', actions: ['다시 시도'] },
  NO_USER_MESSAGE: { icon: 'chat', title: '아직 들려준 이야기가 없어요', body: '글을 만들려면 답변이 하나 이상 필요해요.', actions: ['답변 쓰기'] },
  DIARY_INCOMPLETE: { icon: 'alert', title: '아직 준비되지 않은 페이지가 있어요', body: '모든 페이지에 그림과 글이 있어야 저장할 수 있어요.', actions: ['페이지 확인'] },
  PAGE_NOT_SHAREABLE: { icon: 'pin', title: '공유할 수 없는 페이지예요', body: '위치를 모르는 페이지는 비공개로만 저장돼요.', actions: ['확인'] },
  ALREADY_REPORTED: { icon: 'alert', title: '이미 신고한 페이지예요', body: '같은 페이지는 한 번만 신고할 수 있어요.', actions: ['확인'] },
  CANNOT_REPORT_OWN_PAGE: { icon: 'user', title: '내 페이지는 신고할 수 없어요', body: '내 일기는 마이페이지에서 고치거나 삭제할 수 있어요.', actions: ['확인'] },
  SEARCH_AI_UNAVAILABLE: { icon: 'refresh', title: '지금은 검색할 수 없어요', body: '잠시 뒤 다시 찾아보세요. 구를 골라 둘러볼 수도 있어요.', actions: ['다시 시도'] },
  UNAUTHORIZED: { icon: 'user', title: '다시 로그인해 주세요', body: '로그인이 만료됐어요.', actions: ['로그인'] },
  NOT_FOUND: { icon: 'alert', title: '볼 수 없는 일기예요', body: '삭제됐거나 비공개로 바뀌었어요.', actions: ['목록으로'] },
};

/** 개인정보처리방침 8개 항목 */
export const POLICY = [
  ['1. 수집하는 정보', ['계정: 이메일, 닉네임, 비밀번호. Google로 로그인하면 Google 계정 이메일을 받아요.', '일기: 사진, 날짜와 시간, 구 단위 지역, 챗봇 대화, 일기 글.', '활동: 내가 누른 좋아요·싫어요, 신고 내용.']],
  ['2. 이용 목적', ['회원 확인, 이메일 인증, 그림체 변환, 챗봇 대화와 일기 글 작성, 소셜 다이어리와 AI 검색 제공, 신고 처리에 사용해요.']],
  ['3. 사진과 위치', ['사진의 회전을 바로잡고 긴 변을 2048px 이하로 줄인 뒤 EXIF를 지운 JPEG로 저장해요. GPS 좌표는 구를 판정하는 데만 쓰고 저장하지 않아요.']],
  ['4. 얼굴 정보', ['사진 속 얼굴은 그림체 변환에 함께 쓰일 수 있어요. 마이페이지의 얼굴 데이터 관리에서 관리할 수 있어요. [처리 방식 확정 필요]']],
  ['5. 외부 처리', ['Google Gemini: 대화, 일기 글, 검색', 'Cloudflare Workers AI: 그림체 변환', '네이버 클라우드: GPS를 구로 변환', 'Google 로그인: 계정 확인', '메일 서비스: 인증 코드 발송']],
  ['6. 다른 사용자에게 보이는 것', ['공개한 페이지만 닉네임, 날짜, 구, 글, 이미지가 보여요. 대화 내용은 보이지 않아요. 좋아요와 싫어요 수는 작성자를 포함해 누구에게도 보이지 않아요.']],
  ['7. 보관과 삭제', ['일기를 삭제하면 페이지, 대화, 반응, 신고, 이미지 파일을 바로 함께 지워요. 계정 정보 보관 기간: [보관 기간 확정 필요]']],
  ['8. 문의', ['개인정보 담당: [담당자·연락처]', '시행일: [시행일]']],
];

/** 신고 사유 */
export const REPORT_REASONS = ['스팸·광고', '부적절한 내용', '개인정보 노출', '기타'];

/** 목업 이미지 처리: 그림체 변환을 흉내 내는 필터 (실제 변환은 서버가 한다) */
export const PAINT_FILTER = 'saturate(0.85) contrast(0.95) sepia(0.18)';
export const PAINT_FILTERS = [PAINT_FILTER, 'saturate(1.1) contrast(1.02) sepia(0.28) hue-rotate(-8deg)', 'saturate(0.7) contrast(0.92) sepia(0.35)'];

export const DEMO_PHOTOS = [
  { name: '사진 1', scene: 'sceneSeongsu', at: new Date(2026, 10, 6, 14, 30), gu: '마포구' },
  { name: '사진 2', scene: 'sceneHanRiver', at: new Date(2026, 10, 6, 15, 10), gu: '마포구' },
  { name: '사진 3', scene: 'sceneGyeongbok', at: new Date(2026, 10, 6, 16, 5), gu: null },
  { name: '사진 4', scene: 'sceneEmpty', at: null, gu: '마포구', failConv: true },
];

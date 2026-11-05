// SEOUL MATE v3 — 규칙 상수와 문구. 서버 데이터는 api.js / store.jsx 가 가져온다.

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

/** 에러 카드 (API 에러 코드 → 문구). 처음 16종은 디자인, 나머지는 서버 코드 대응용 */
export const ERRORS = {
  EMAIL_SEND_FAILED: { icon: 'alert', title: '인증 메일을 보내지 못했어요', body: '계정은 만들어졌어요. 잠시 뒤 다시 보내 주세요.', actions: ['다시 보내기'] },
  TOO_MANY_REQUESTS: { icon: 'refresh', title: '조금만 기다려 주세요', body: '인증 메일은 60초에 한 번만 보낼 수 있어요. 잠시 뒤에 다시 눌러 주세요.', actions: ['확인'] },
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
  /* 서버 계약(api-spec.md)에 있지만 디자인에 카드가 없던 코드 — 같은 모양으로 추가 */
  INTERNAL_ERROR: { icon: 'alert', title: '문제가 생겼어요', body: '잠시 뒤 다시 시도해 주세요.', actions: ['확인'] },
  NETWORK_ERROR: { icon: 'refresh', title: '서버에 연결하지 못했어요', body: '인터넷 연결을 확인하고 다시 시도해 주세요.', actions: ['확인'] },
  INVALID_STATE: { icon: 'alert', title: '지금은 할 수 없어요', body: '일기 상태가 바뀌었어요. 처음 화면으로 돌아가 다시 확인해 주세요.', actions: ['확인'] },
  VALIDATION_FAILED: { icon: 'alert', title: '입력을 확인해 주세요', body: '입력한 내용이 맞지 않아요.', actions: ['확인'] },
  METADATA_INCOMPLETE: { icon: 'pin', title: '날짜나 위치가 비어 있어요', body: '모든 사진의 날짜와 위치를 채워 주세요.', actions: ['확인'] },
  DATE_MISMATCH: { icon: 'alert', title: '다른 날 찍은 사진이 있어요', body: '일기 한 편에는 같은 날 사진만 담을 수 있어요.', actions: ['확인'] },
  PAGE_REPORT_BLOCKED: { icon: 'alert', title: '신고로 차단된 페이지예요', body: '차단된 페이지는 다시 공개할 수 없어요.', actions: ['확인'] },
  CHAT_LIMIT_REACHED: { icon: 'chat', title: '일기 분량을 다 채웠어요', body: '이제 일기 글을 만들어 주세요.', actions: ['확인'] },
  AUTH_FAILED: { icon: 'user', title: '로그인하지 못했어요', body: '잠시 뒤 다시 시도해 주세요.', actions: ['확인'] },
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

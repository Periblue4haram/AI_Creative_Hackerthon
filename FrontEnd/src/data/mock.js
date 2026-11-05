// 백엔드 연동 전까지 화면을 채우는 목업 데이터.
// API 계약은 저장소 루트의 api-spec.md 를 따라 교체하면 된다.

/** 일기 한 편에 올릴 수 있는 사진 수 (새 Figma: 1~5장) */
export const MAX_PHOTOS = 5;

/** 사진 장면 → assetMap 키 */
export const SCENES = {
  seongsu: 'sceneSeongsu',
  hanRiver: 'sceneHanRiver',
  gyeongbok: 'sceneGyeongbok',
};

const TITLES = [
  { scene: 'seongsu', district: '성동구', place: '성수동', title: '빨간 벽돌 골목의 라테' },
  { scene: 'gyeongbok', district: '종로구', place: '종로', title: '돌담길을 따라 걷던 오후' },
  { scene: 'hanRiver', district: '용산구', place: '이촌동', title: '한강 노을을 기다리며' },
];

const BODY =
  '친구와 성수동으로 카페 투어를 갔다. 오래된 공장을 고친 카페에서 따뜻한 라테를 마셨고, 붉은 벽돌 골목을 한참 걸었다.';

/** 최신순 12편. 첫 장이 홈의 "마지막 11.4 · 성수동" (2026.11.04 성수동) */
export const ENTRIES = Array.from({ length: 12 }, (_, i) => {
  const base = TITLES[i % TITLES.length];
  const d = new Date(2026, 10, 4 - i * 2);
  return { id: i + 1, date: d, ...base, body: BODY, caption: 'AI 그림일기 · 수채화' };
});

/** 사진 업로드 화면의 시작 상태 (Figma 데모와 동일: 4장 중 1장 실패) */
export const DEMO_PHOTOS = [
  { id: 'p1', scene: 'seongsu', time: '11:20', rotate: 0 },
  { id: 'p2', scene: 'hanRiver', time: '13:05', rotate: -2 },
  { id: 'p3', scene: 'gyeongbok', time: '15:42', rotate: 2 },
  { id: 'p4', scene: 'seongsu', time: '', rotate: -3, failed: true },
];

/** 챗봇 질문 흐름 (README: 첫 질문은 사진을 분석해 행동을 유추, 이후는 소감과 정보) */
export const CHAT_QUESTIONS = [
  { text: '성수동에 다녀오셨네요! 오늘은 어떤 일로 가셨어요?' },
  { text: '멋진 하루였겠어요. 누구와 함께였나요?', quick: ['혼자', '친구와', '연인과', '가족과'] },
  { text: '가장 기억에 남는 순간은 언제였나요?' },
  { text: '그때 기분은 어땠나요?' },
  { text: '마지막으로, 오늘을 한 줄로 남긴다면요?' },
];
export const CHAT_TOTAL = 5;

/** 서울 25개 구, 책장 3쪽(9·9·7). 내 일기 수 / 모두의 일기 수 (목업) */
export const DISTRICTS = [
  ['강남구', 2, 214], ['강동구', 0, 41], ['강북구', 0, 18], ['강서구', 0, 52], ['관악구', 0, 63], ['광진구', 0, 27],
  ['구로구', 0, 22], ['금천구', 0, 36], ['노원구', 0, 31],
  ['도봉구', 0, 12], ['동대문구', 0, 29], ['동작구', 0, 24], ['마포구', 2, 188], ['서대문구', 0, 33], ['서초구', 0, 57],
  ['성동구', 3, 128], ['성북구', 0, 45], ['송파구', 0, 74],
  ['양천구', 0, 19], ['영등포구', 0, 61], ['용산구', 1, 96], ['은평구', 0, 20], ['종로구', 4, 143], ['중구', 0, 88], ['중랑구', 0, 15],
].map(([name, mine, all]) => ({ name, mine, all }));

/** 지도 팝업의 격자 (행별 구 이름 또는 null). 모두 25칸 + 빈칸 */
export const MAP_ROWS = [
  ['은평', null, '강북', '도봉', '노원'],
  ['서대문', '종로', '성북', '동대문', '중랑'],
  ['강서', '마포', '중', '성동', '광진'],
  ['양천', '영등포', '용산', '서초', '강남', '송파', '강동'],
  ['구로', '금천', '동작', '관악'],
];

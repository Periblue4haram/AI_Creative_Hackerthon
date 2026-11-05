# FrontEnd · 서울 그림일기 (React)

Figma [서울 그림일기 – UI 디자인](https://www.figma.com/design/nrqfzA5AmL5A7x1Ue8eng1) 모바일 화면(390 × 844)을 React(Vite)로 구현한 프런트엔드예요.
사용자 흐름은 저장소 루트 `README.md` 의 흐름도를 따릅니다.

## 실행

```bash
cd FrontEnd
npm install
npm run assets   # Figma 에서 이미지·아이콘 SVG 를 src/assets 로 내려받기 (처음 한 번)
npm run dev
```

`npm run dev` / `npm run build` 는 시작 전에 없는 에셋만 자동으로 받아요(`predev`, `prebuild`).

> **에셋 URL은 7일 뒤 만료돼요.** `scripts/assets.json` 의 URL이 만료돼 `npm run assets` 가 실패하면
> Figma MCP(`get_design_context`)로 URL을 다시 받아 그 파일을 갱신하세요.
> `src/assets/*` 는 `.gitignore` 에 있어서 커밋되지 않아요.

## 화면과 라우트

| 라우트 | Figma 프레임 | 비고 |
|---|---|---|
| `/onboarding` | 01-1 Onboarding · 소개 | 처음 방문 시 진입 |
| `/consent` | 01-2 Onboarding · 동의 | 필수 2개를 체크해야 시작 → `/` |
| `/` | Home A / Mobile (책상) | 일기장 → `/diary`, CTA → `/today` |
| `/today` | Home B / Mobile (오늘 페이지) | 사진 올리기 → `/new/photos` |
| `/diary` | 04 내 일기 · `?empty=1` 은 04-E 빈 상태 | 이전/다음 장 넘김 |
| `/new/photos` | 05 사진 업로드 | 실제 파일 선택, 드래그로 순서 변경 |
| `/new/confirm` | 06 사진 확인 | 위치 수정, 얼굴 처리 선택 |
| `/new/chat` | 07 챗봇 대화 | 목업 질문 5개. "일기 만들기" → `/diary` |
| `/soon` | (디자인 없음) | 책장 · 마이페이지 · 지도 팝업 · 개인정보 처리 방침 자리표시자 |

## 구조

```
src/
  assetMap.js        scripts/assets.json 에서 생성한 에셋 import 목록
  components/        StatusBar · AppBar · TabBar · Progress · Polaroid · Stamp · Tape · 책상 위 사물
  pages/             화면별 컴포넌트
  data/mock.js       백엔드 연동 전 목업 데이터 (MAX_PHOTOS 등 규칙 상수 포함)
  styles/            tokens.css(Figma 변수) · base.css(공통) · objects.css · pages.css
```

## 아직 비어 있는 부분

- 백엔드(API) 연동, 로그인, 이미지 변환, 일기 설정(4단계) · 저장 화면
- Figma 데스크톱(1440) 홈 레이아웃. 지금은 폭 390px 모바일 프레임을 가운데에 놓아 보여 줘요.
- 사진 장수는 README 확정 규칙(1~4장)을 따라 `MAX_PHOTOS = 4` 로 두었어요. Figma 문구는 "1~5장" 이라 서로 다르니, 팀에서 정해지면 `src/data/mock.js` 상수 하나만 바꾸면 화면 문구도 같이 바뀌어요.

## 새 Figma 반영분 (스크린샷 기준 1차 구현)

| 경로 | 화면 |
| --- | --- |
| `/new/style` | 08 그림일기 설정 (스타일 · 분위기 · 언어) |
| `/new/generating` | 09 생성 중 (목업 타이머) |
| `/new/result` | 10 결과 (데스크톱은 우측 "마음에 드나요?" 패널) |
| `/map` | 03 서울 지도 팝업 |
| `/book/:구` | 11 책 펼치기 전환 (가까워짐 → 암전 → 펼쳐짐 → `/shelf/:구`) |
| `/shelf`, `/shelf/:구` | 05·12 책장 / 자치구 책 |

- 1024px 이상에서 `/`, `/today`, `/new/chat`, `/new/result`, `/shelf` 는 데스크톱 레이아웃으로 바뀝니다 (`useDesktop`, `DesktopNav`, `styles/extra.css`).
- 이 반영분은 Figma MCP 호출 한도 때문에 스크린샷만 보고 만들었습니다. 위치·간격·신규 이미지는 `get_design_context` 로 다시 맞춰야 합니다.

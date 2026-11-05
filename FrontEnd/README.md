# FrontEnd · SEOUL MATE (React)

`scrapbook-ui-v3.html` 기준(모바일 390 × 844 + 데스크톱 1440 × 934)으로 만든 React(Vite) 프런트엔드예요.
사용자 흐름은 저장소 루트 `README.md` 의 흐름도를 따릅니다. 백엔드가 없어서 **모든 데이터는 목업**이고 브라우저 `localStorage` 에 저장돼요.

## 실행

```bash
cd FrontEnd
npm install
npm run assets   # 책상·아이콘·폴라로이드 등 Figma 에셋을 src/assets 로 내려받기 (처음 한 번)
npm run dev
```

> 에셋 URL은 7일 뒤 만료돼요. `npm run assets` 가 실패하면 `scripts/assets.json` 의 URL을 Figma MCP 로 다시 받아 갱신하세요.
> `src/assets/*` 는 커밋되지 않아요. 로고는 `src/images/logo-seoul-mate.png` 로 커밋돼 있어요.

데모 계정: `user@example.com` / `password123` (일기 3편이 들어 있어요). 이메일 인증 코드는 `000000` 만 틀린 코드이고, 나머지 6자리는 통과해요.

## 화면과 라우트 (v3)

| 섹션 | 라우트 | 화면 |
|---|---|---|
| 01 인증 | `/start` `/signup` `/verify` `/login` `/privacy` | A1 시작 · A2 회원가입 · A3 이메일 인증 · A4 로그인 · A5 개인정보처리방침 |
| 02 홈 | `/` | H1 첫 사용 · H2 일기 있음 (데스크톱은 소셜 다이어리 카드 포함) |
| 03 일기 만들기 ① | `/create` `/create/info` | C1 사진 올리기(1~4장) · C2 위치 · C3 날짜 · C4 날짜 불일치 |
| 04 일기 만들기 ② | `/create/talk` `/create/talk/:n` `/create/writing/:n` | C5 페이지 현황(+변환 실패 시트) · C6 대화(500/800자) · C7 글 생성 중 |
| 05 미리보기·저장 | `/create/preview` `/create/edit/:n` `/create/publish` | C8 미리보기 · C9 글 수정 · C10 공개 설정 |
| 06 소셜 다이어리 | `/social` `/social/:gu` `/social/diary/:id` `/social/search` | S1 구 고르기 · S2 목록 · S3 상세 · S4 AI 검색 · S5 신고 시트 |
| 07 내 일기 | `/mine` `/mine/:id` `/mine/:id/edit/:n` `/mine/:id/visibility` | N1 목록 · N2 상세(차단 페이지 포함) · N3 공개 범위 변경 · N4 삭제 확인 |
| 08 마이페이지 | `/me` `/me/settings` `/me/edit` `/me/info` `/me/face` | M1 프로필 · M3 설정 · M2 프로필 수정(+M2-1 자르기) · M4 개인정보 · M5 얼굴 데이터 |
| 09 에러 | `/errors` | 에러 카드 16종 한눈에 보기 (실제 화면에서는 시트로 올라와요) |

- 로그인하지 않으면 `/start` 로 보내요. 1024px 이상은 데스크톱 레이아웃, 그 아래는 390px 폰 프레임이에요 (`useDesktop`).
- 하단 탭(모바일)과 상단 내비(데스크톱)는 홈 / 소셜 다이어리 / 마이페이지.

### 상태 미리보기 (`?s=`)

디자인 검수용으로 예외 상태를 바로 열 수 있어요.

- `/signup?s=dup` · `/verify?s=wrong` · `/login?s=wrong`
- `/create?s=out` · `/create/info?s=loc|locE|locU|date|mismatch` · `/create/talk?s=fail`
- `/create/talk/1?s=500|800|aifail` · `/create/preview?s=regenfail`
- `/social/마포구?s=report` · `/social/search?s=empty|aifail`
- `/mine/e3?s=blocked|delete` · `/me?s=logout` · `/me/edit?s=crop` · `/me/face?s=confirm|empty`

## 규칙 상수 (`src/v3/data.js`)

서비스 지역 5개 구(`GUS`), 사진 1~4장(`MAX_PHOTOS`), 장당 10MB·JPEG/PNG/WebP, 대화 분량 500자 안내 / 800자 마감, 글 800자, 하루는 새벽 5시에 바뀜(`logicalDay`).
좋아요·싫어요 수는 어디에도 보여 주지 않아요.

## 구조

```
src/
  App.jsx            라우트 + 로그인 가드
  v3/
    data.js          상수·문구·에러 16종·목업 데이터
    store.jsx        계정·내 일기·소셜 반응·얼굴 데이터·새 일기 초안 (localStorage)
    ui.jsx           Page(모바일/데스크톱 틀)·Field·Sheet·ErrorCard·Toast·Pager …
    v3.css           v3 화면 스타일
    pages/           Auth · Home · Create1 · Create2 · Social · Mine · Me · ErrorGallery
  components/        StatusBar · AppBar · TabBar · Progress · Polaroid · Tape · NoticeSheet · DesktopNav · Logo …
  styles/            tokens.css(Figma 변수) · base · objects · pages · extra
```

## 목업과 실제 연동의 차이 (백엔드 붙일 때 바꿀 곳)

- 사진의 촬영 시각은 EXIF 대신 파일 수정 시각을 쓰고, **위치(구)는 항상 직접 입력**해요. 실제로는 서버가 GPS → 구를 판정해요 (C1-E "지역 밖" 시트는 그때 연결).
- 그림 변환·챗봇 답변·글 생성·AI 검색·신고 차단은 타이머/규칙 기반 흉내예요 (`store.jsx`, `Create2.jsx`, `Social.jsx`).
- 위치·간격은 HTML 시안을 보고 맞춘 근사치예요. 로컬에서 에셋을 받은 뒤 시안과 나란히 보며 다듬어 주세요.

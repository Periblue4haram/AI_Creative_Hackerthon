# FrontEnd · SEOUL MATE (React)

`scrapbook-ui-v3.html` 기준(모바일 390 × 844 + 데스크톱 1440 × 934)으로 만든 React(Vite) 프런트엔드예요.
사용자 흐름은 저장소 루트 `README.md` 의 흐름도를 따릅니다. 데이터는 **백엔드 REST API**(`.scratch/ai-diary/api-spec.md`)에서 가져와요. 서버에 API가 없는 프로필 사진·얼굴 데이터만 아직 브라우저(`localStorage`)에 둬요 (아래 보류사항).

## 실행

```bash
cd FrontEnd
npm install
npm run assets   # 책상·아이콘·폴라로이드 등 Figma 에셋을 src/assets 로 내려받기 (처음 한 번)
npm run dev
```

백엔드(Spring Boot, 기본 `localhost:8080`)를 먼저 띄워 두세요. 개발 서버가 `/api` 요청을 8080 으로 넘겨 줘서 백엔드 `CORS_ALLOWED_ORIGINS` 를 바꿀 필요가 없어요. 다른 주소는 `.env.example` 참고.

> 에셋 URL은 7일 뒤 만료돼요. `npm run assets` 가 실패하면 `scripts/assets.json` 의 URL을 Figma MCP 로 다시 받아 갱신하세요.
> `src/assets/*` 는 커밋되지 않아요. 로고는 `src/images/logo-seoul-mate.png` 로 커밋돼 있어요.

가입은 실제 메일로 6자리 코드가 가요(백엔드 SMTP 설정 필요).

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

디자인 검수용으로 예외 상태를 열 수 있어요. 서버 데이터가 필요한 상태(`/create` 이후 단계, 내 일기 상세, 소셜 목록 등)는 실제 API 연동과 함께 없앴어요.

- `/signup?s=dup` · `/verify?s=wrong` · `/login?s=wrong`
- `/start?s=google` · `/me?s=logout` · `/me/edit?s=crop` · `/me/face?s=confirm|empty` · `/social/search?s=aifail`
- `/errors` 에서 에러 카드 전체를 볼 수 있어요.

## 규칙 상수 (`src/v3/data.js`)

서비스 지역 5개 구(`GUS`), 사진 1~4장(`MAX_PHOTOS`), 장당 10MB·JPEG/PNG/WebP, 대화 분량 500자 안내 / 800자 마감, 글 800자, 하루는 새벽 5시에 바뀜(`logicalDay`).
좋아요·싫어요 수는 어디에도 보여 주지 않아요.

## 구조

```
src/
  App.jsx            라우트 + 로그인 가드
  v3/
    api.js           fetch 클라이언트: Bearer 토큰, 401 때 재발급, ApiError(code)
    adapt.js         서버 응답 ↔ 화면 모양 변환 (구 이름, 공개 범위 …)
    data.js          상수·문구·에러 카드(API 에러 코드 → 문구)
    store.jsx        계정·내 일기·소셜·새 일기 초안 상태와 API 호출 (async, 결과는 {ok, code})
    ui.jsx           Page(모바일/데스크톱 틀)·Field·Sheet·ErrorCard·Toast·Pager …
    v3.css           v3 화면 스타일
    pages/           Auth · Home · Create1 · Create2 · Social · Mine · Me · ErrorGallery
  components/        StatusBar · AppBar · TabBar · Progress · Polaroid · Tape · NoticeSheet · DesktopNav · Logo …
  styles/            tokens.css(Figma 변수) · base · objects · pages · extra
```

## 연동 방식 메모

- 촬영 날짜·위치는 서버가 사진 EXIF 에서 읽어요. 빠진 것(`metadataIssues`)만 C2~C4 에서 물어요. 사진은 C1 에서 "다음"을 누르면 서버에 올라가요.
- 그림 변환은 서버가 백그라운드로 하고, 화면은 3초마다 상태를 읽어요. 챗봇·글 생성·AI 검색·신고 차단도 모두 서버가 처리해요.
- 진행 중인 새 일기(초안) id 는 `localStorage` 에 남겨 새로고침해도 이어 써요.
- 위치·간격은 HTML 시안을 보고 맞춘 근사치예요. 로컬에서 에셋을 받은 뒤 시안과 나란히 보며 다듬어 주세요.

## 백엔드 연동 보류사항

백엔드 API가 없어서 **아직 연동하지 않은 것**이에요. (Google 로그인은 `src/v3/google.js` 로 연동했고, 구글 콘솔의 승인된 JavaScript 원본에 `http://localhost:5173` 을 등록해야 해요. 닉네임 문구는 서버 중복 규칙에 맞춰 "다른 사람이 쓰는 닉네임은 쓸 수 없어요"로 바꿨어요.) 진행하라고 하기 전에는 그대로 둬요.

| 항목 | 현재 | 이유 |
|---|---|---|
| 프로필 사진 | 이 브라우저에만 저장 | 백엔드에 프로필 사진 API 없음 (`/me` 는 닉네임만) |
| 얼굴 데이터 관리 | 이 브라우저에만 저장, 기본값 "없음" | 백엔드에 얼굴 데이터 API 없음 · 개인정보처리방침 4항 "처리 방식 확정 필요" |
| 마이페이지 "로그인 방식" 행 | 삭제 | `/me` 응답에 가입 방식 필드 없음 |
| 새 일기 초안 버리기 | 페이지 현황(C5)에 "이 일기 버리고 새로 시작" 버튼 추가 | 서버에 초안이 남아 이어 쓰게 되므로 필요. 디자인에 없던 버튼이라 확인 필요 |
| 소셜 목록 "더 보기" | 버튼 추가 | API가 20개씩 페이지로 줌. 디자인에 없던 버튼 |
| 에러 카드 | 서버 코드 대응용 9종 추가 | `INTERNAL_ERROR` `NETWORK_ERROR` `INVALID_STATE` `VALIDATION_FAILED` `METADATA_INCOMPLETE` `DATE_MISMATCH` `PAGE_REPORT_BLOCKED` `CHAT_LIMIT_REACHED` 등 문구는 임시 |
| 이미지 | 그림체 필터(목업) 제거, 서버 이미지를 그대로 표시 | 변환은 서버가 함 |
| 인증 코드 만료 | 재발송 후 10분으로 표시 | 재발송 응답(204)에 만료 시간이 없어 명세의 10분을 씀 |

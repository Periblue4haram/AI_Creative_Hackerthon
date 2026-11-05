import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import useDesktop from './hooks/useDesktop.js';
import { Login, Privacy, Signup, Start, Verify } from './v3/pages/Auth.jsx';
import { CreateInfo, CreatePhotos } from './v3/pages/Create1.jsx';
import { CreateChat, CreatePreview, CreateTalk, CreateWriting, EditText, Publish } from './v3/pages/Create2.jsx';
import ErrorGallery from './v3/pages/ErrorGallery.jsx';
import Home from './v3/pages/Home.jsx';
import Me, { MeEdit, MeFace, MeInfo } from './v3/pages/Me.jsx';
import { MineDetail, MineList } from './v3/pages/Mine.jsx';
import { SocialDiary, SocialHome, SocialList, SocialSearch } from './v3/pages/Social.jsx';
import { useApp } from './v3/store.jsx';

/** 로그인하지 않은 사람은 시작 화면(A1)으로 보낸다. */
function RequireAuth({ children }) {
  const { auth } = useApp();
  const location = useLocation();
  if (!auth.ready) return <div className="screen screen--cream" aria-busy="true" />; // 저장된 로그인을 확인하는 동안
  return auth.me ? children : <Navigate to="/start" replace state={{ from: location }} />;
}
/** 이미 로그인했다면 홈으로. (검수용 ?s= 미리보기는 그대로 보여 준다) */
function GuestOnly({ children }) {
  const { auth } = useApp();
  const { search } = useLocation();
  if (!auth.ready) return <div className="screen screen--cream" aria-busy="true" />;
  return auth.me && !search.includes('s=') ? <Navigate to="/" replace /> : children;
}
const A = (el) => <RequireAuth>{el}</RequireAuth>;

export default function App() {
  const wide = useDesktop();
  return (
    <div className={`app ${wide ? 'app--wide' : ''}`}>
      <Routes>
        {/* 01 인증 */}
        <Route path="/start" element={<GuestOnly><Start /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/privacy" element={<Privacy />} />

        {/* 02 홈 */}
        <Route path="/" element={A(<Home />)} />

        {/* 03~05 일기 만들기 */}
        <Route path="/create" element={A(<CreatePhotos />)} />
        <Route path="/create/info" element={A(<CreateInfo />)} />
        <Route path="/create/talk" element={A(<CreateTalk />)} />
        <Route path="/create/talk/:n" element={A(<CreateChat />)} />
        <Route path="/create/writing/:n" element={A(<CreateWriting />)} />
        <Route path="/create/preview" element={A(<CreatePreview />)} />
        <Route path="/create/edit/:n" element={A(<EditText />)} />
        <Route path="/create/publish" element={A(<Publish />)} />

        {/* 06 소셜 다이어리 */}
        <Route path="/social" element={A(<SocialHome />)} />
        <Route path="/social/search" element={A(<SocialSearch />)} />
        <Route path="/social/diary/:id" element={A(<SocialDiary />)} />
        <Route path="/social/:gu" element={A(<SocialList />)} />

        {/* 07 내 일기 */}
        <Route path="/mine" element={A(<MineList />)} />
        <Route path="/mine/:id" element={A(<MineDetail />)} />
        <Route path="/mine/:id/edit/:n" element={A(<EditText mine />)} />
        <Route path="/mine/:id/visibility" element={A(<Publish mine />)} />

        {/* 08 마이페이지 */}
        <Route path="/me" element={A(<Me />)} />
        <Route path="/me/settings" element={A(<Me initial="settings" />)} />
        <Route path="/me/edit" element={A(<MeEdit />)} />
        <Route path="/me/info" element={A(<MeInfo />)} />
        <Route path="/me/face" element={A(<MeFace />)} />

        {/* 09 에러 카드 모아 보기 (검수용) */}
        <Route path="/errors" element={<ErrorGallery />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

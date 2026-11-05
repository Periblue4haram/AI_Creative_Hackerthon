import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ComingSoon from './pages/ComingSoon.jsx';
import Consent from './pages/Consent.jsx';
import Home from './pages/Home.jsx';
import MyDiary from './pages/MyDiary.jsx';
import NewChat from './pages/NewChat.jsx';
import NewConfirm from './pages/NewConfirm.jsx';
import NewPhotos from './pages/NewPhotos.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Today from './pages/Today.jsx';
import BookOpen from './pages/BookOpen.jsx';
import District from './pages/District.jsx';
import MapPopup from './pages/MapPopup.jsx';
import NewGenerating from './pages/NewGenerating.jsx';
import NewResult from './pages/NewResult.jsx';
import NewStyle from './pages/NewStyle.jsx';
import MyPage from './pages/MyPage.jsx';
import Shelf from './pages/Shelf.jsx';
import useDesktop from './hooks/useDesktop.js';

function onboarded() {
  try {
    return localStorage.getItem('seoul-diary:onboarded') === '1';
  } catch {
    return false;
  }
}

/** 처음 방문한 사람은 온보딩부터 보여 준다. */
function RequireOnboarding({ children }) {
  const location = useLocation();
  return onboarded() ? children : <Navigate to="/onboarding" replace state={{ from: location }} />;
}

/** Figma 에 데스크톱(1440) 프레임이 있는 화면. 나머지는 데스크톱에서도 폰 프레임으로 보여 준다. */
const WIDE_ROUTES = ['/', '/today', '/new/chat', '/new/result', '/shelf', '/me'];

export default function App() {
  const { pathname } = useLocation();
  const wide = useDesktop() && WIDE_ROUTES.includes(pathname);
  return (
    <div className={`app ${wide ? 'app--wide' : ''}`}>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/consent" element={<Consent />} />
        <Route path="/" element={<RequireOnboarding><Home /></RequireOnboarding>} />
        <Route path="/today" element={<RequireOnboarding><Today /></RequireOnboarding>} />
        <Route path="/diary" element={<RequireOnboarding><MyDiary /></RequireOnboarding>} />
        <Route path="/new/photos" element={<RequireOnboarding><NewPhotos /></RequireOnboarding>} />
        <Route path="/new/confirm" element={<RequireOnboarding><NewConfirm /></RequireOnboarding>} />
        <Route path="/new/chat" element={<RequireOnboarding><NewChat /></RequireOnboarding>} />
        <Route path="/new/style" element={<RequireOnboarding><NewStyle /></RequireOnboarding>} />
        <Route path="/new/generating" element={<RequireOnboarding><NewGenerating /></RequireOnboarding>} />
        <Route path="/new/result" element={<RequireOnboarding><NewResult /></RequireOnboarding>} />
        <Route path="/map" element={<RequireOnboarding><MapPopup /></RequireOnboarding>} />
        <Route path="/book/:district" element={<RequireOnboarding><BookOpen /></RequireOnboarding>} />
        <Route path="/shelf" element={<RequireOnboarding><Shelf /></RequireOnboarding>} />
        <Route path="/shelf/:name" element={<RequireOnboarding><District /></RequireOnboarding>} />
        <Route path="/me" element={<RequireOnboarding><MyPage /></RequireOnboarding>} />
        <Route path="/soon" element={<ComingSoon />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

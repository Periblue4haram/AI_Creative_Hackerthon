import { Link } from 'react-router-dom';
import assets from '../assetMap.js';
import Logo from './Logo.jsx';

const TABS = [
  { id: 'home', label: '홈', icon: 'iconDesk', to: '/' },
  { id: 'social', label: '소셜 다이어리', icon: 'iconBooks', to: '/social' },
  { id: 'me', label: '마이페이지', icon: 'iconUser', to: '/me' },
];

/** 데스크톱 상단 바: [앱 이름] Seoul travel diary + 홈 · 소셜 다이어리 · 마이페이지 */
export default function DesktopNav({ active = 'home' }) {
  return (
    <header className="dnav">
      <Link to="/" className="dnav__logo">
        <Logo height={44} />
        
      </Link>
      <nav className="dnav__tabs" aria-label="주 메뉴">
        {TABS.map((t) => (
          <Link key={t.id} to={t.to} className={`dnav__tab ${active === t.id ? 'dnav__tab--on' : ''}`} aria-current={active === t.id ? 'page' : undefined}>
            <img src={assets[t.icon]} alt="" />
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

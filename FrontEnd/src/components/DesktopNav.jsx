import { Link } from 'react-router-dom';
import assets from '../assetMap.js';
import Logo from './Logo.jsx';

const TABS = [
  { id: 'desk', label: '책상', icon: 'iconDesk', to: '/' },
  { id: 'shelf', label: '책장', icon: 'iconBooks', to: '/shelf' },
  { id: 'me', label: '마이페이지', icon: 'iconUser', to: '/me' },
];

/** 데스크톱 상단 바: [앱 이름] Seoul travel diary + 책상 · 책장 · 마이페이지 */
export default function DesktopNav({ active = 'desk' }) {
  return (
    <header className="dnav">
      <Link to="/" className="dnav__logo">
        <Logo height={44} />
        <span className="t-hand-small">Seoul travel diary</span>
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

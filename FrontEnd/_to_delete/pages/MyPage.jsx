import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import assets from '../assetMap.js';
import DesktopNav from '../components/DesktopNav.jsx';
import Logo from '../components/Logo.jsx';
import { PaperGrain, Stamp, StatusBar, TabBar, WoodDesk } from '../components/common.jsx';
import useDesktop from '../hooks/useDesktop.js';
import { ENTRIES } from '../data/mock.js';

const S = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Chevron = () => (
  <svg {...S} stroke="#8C7256" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
);
const ICON = {
  globe: <svg {...S} stroke="#8C7256"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18c-3-3.5-3-14.5 0-18" /></svg>,
  shield: <svg {...S} stroke="#8C7256"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></svg>,
  face: <svg {...S} stroke="#8C7256"><circle cx="12" cy="12" r="9" /><path d="M9 10v.5M15 10v.5M8.5 15a5 5 0 0 0 7 0" /></svg>,
  logout: <svg {...S} stroke="#9A3B2E"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>,
};

const NAME_KEY = 'seoul-diary:name';
const readName = () => {
  try {
    return localStorage.getItem(NAME_KEY) || 'Alex Kim';
  } catch {
    return 'Alex Kim';
  }
};

function Profile({ name, editing, onEdit, onName }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const rows = [
    ['지은이', editing ? null : name],
    ['처음 쓴 날', '2026년 10월 28일'],
    ['쓴 일기', `${ENTRIES.length}편`],
    ['다녀온 동네', '5개 구'],
    ['펴낸 곳', '[앱 이름]'],
  ];
  return (
    <div className="me-profile">
      <span className="me-avatar t-title" aria-hidden="true">{initials}</span>
      <h2 className="sr-only">SEOUL MATE</h2>
      <Logo height={58} />
      <p className="t-caption">판권 · 내 일기장의 마지막 장</p>
      <dl className="me-rows">
        {rows.map(([k, v]) => (
          <div key={k} className="me-row">
            <dt className="t-caption">{k}</dt>
            <dd className="t-body-strong">
              {v ?? <input className="me-input" value={name} maxLength={20} autoFocus aria-label="지은이" onChange={(e) => onName(e.target.value)} />}
            </dd>
          </div>
        ))}
      </dl>
      <button type="button" className="btn btn--secondary me-edit" onClick={onEdit}>
        <img src={assets.iconEdit} alt="" />
        {editing ? '저장' : '프로필 수정'}
      </button>
    </div>
  );
}

function Settings({ onLogout, onSoon }) {
  return (
    <div className="me-settings">
      <h2 className="t-heading">설정</h2>
      <p className="t-caption">내 일기장과 계정을 관리해요</p>
      <ul className="me-list">
        <li><button type="button" onClick={onSoon}>{ICON.globe}<span className="t-body">언어 설정</span><em className="t-caption">English</em><Chevron /></button></li>
        <li><button type="button" onClick={onSoon}>{ICON.shield}<span className="t-body">개인정보 관리</span><Chevron /></button></li>
        <li><button type="button" onClick={onSoon}>{ICON.face}<span className="t-body">얼굴 데이터 관리</span><Chevron /></button></li>
        <li><button type="button" className="me-logout" onClick={onLogout}>{ICON.logout}<span className="t-body">로그아웃</span></button></li>
      </ul>
      <p className="me-version t-date">버전 1.0.0</p>
    </div>
  );
}

/** 13 마이페이지: 내 일기장의 마지막 장. 모바일은 프로필/설정 탭, 데스크톱은 두 페이지 펼침. */
export default function MyPage() {
  const navigate = useNavigate();
  const wide = useDesktop();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'settings' ? 'settings' : 'profile';
  const [name, setName] = useState(readName);
  const [editing, setEditing] = useState(false);

  const toggleEdit = () => {
    if (editing) {
      const next = name.trim() || 'Alex Kim';
      setName(next);
      try {
        localStorage.setItem(NAME_KEY, next);
      } catch {
        /* 저장이 막힌 환경에서는 화면 상태만 유지 */
      }
    }
    setEditing((v) => !v);
  };
  const logout = () => {
    try {
      localStorage.removeItem('seoul-diary:onboarded');
    } catch {
      /* noop */
    }
    navigate('/onboarding', { replace: true });
  };
  const soon = () => navigate('/soon');
  const profile = <Profile name={name} editing={editing} onEdit={toggleEdit} onName={setName} />;
  const settings = <Settings onLogout={logout} onSoon={soon} />;

  if (wide) {
    return (
      <div className="screen screen--desk dsk-screen">
        <WoodDesk />
        <DesktopNav active="me" />
        <div className="me-d">
          <div className="open-diary me-d__book">
            <div className="open-diary__stitch" />
            <div className="open-diary__page me-d__spread">
              <img className="open-diary__lines" src={assets.linedPaper} alt="" />
              <section className="me-d__left">
                {profile}
                <Stamp district="서울" date="2026.11.06" size={86} rotate={-8} style={{ position: 'absolute', right: 60, bottom: 130 }} />
              </section>
              <span className="me-d__gutter" aria-hidden="true" />
              <section className="me-d__right">{settings}</section>
            </div>
            <span className="bookmark" aria-hidden="true" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen--cream screen--fixed">
      <PaperGrain />
      <StatusBar />
      <header className="me-head">
        <h1 className="t-title">마이페이지</h1>
        <div className="seg seg--pill" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'profile'} className={tab === 'profile' ? 'seg--on' : ''} onClick={() => setParams({})}>
            프로필
          </button>
          <button type="button" role="tab" aria-selected={tab === 'settings'} className={tab === 'settings' ? 'seg--on' : ''} onClick={() => setParams({ tab: 'settings' })}>
            설정
          </button>
        </div>
      </header>
      <div className="me-m">
        <WoodDesk />
        <div className="open-diary me-m__book">
          <div className="open-diary__stitch" />
          <div className="open-diary__page me-m__page">
            {tab === 'profile' ? profile : settings}
            {tab === 'profile' && <Stamp district="서울" date="2026.11.06" size={72} rotate={12} style={{ position: 'absolute', right: 8, top: 4 }} />}
          </div>
        </div>
      </div>
      <TabBar active="me" />
    </div>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import assets from '../assetMap.js';

/** 상태 표시줄 (폰 프레임 미리보기에서만 보이는 장식) */
export function StatusBar() {
  return (
    <>
      <div className="safe-top" />
      <div className="status-bar" aria-hidden="true">
        <span className="status-bar__time">9:41</span>
        <img className="status-bar__ind" src={assets.indicators} alt="" />
      </div>
    </>
  );
}

/** 종이 질감 배경 */
export function PaperGrain() {
  return <img className="fill-img" src={assets.paperGrain} alt="" />;
}

/** 나무 책상 배경 */
export function WoodDesk() {
  return <img className="fill-img" src={assets.woodDesk} alt="" />;
}

/** 앱 바: 왼쪽 뒤로/닫기, 명조 제목, 오른쪽 보조 정보 */
export function AppBar({ title, right, icon = 'back', onBack, children }) {
  const navigate = useNavigate();
  const src = icon === 'close' ? assets.iconClose : assets.iconBack;
  return (
    <div className="app-bar">
      <button
        type="button"
        className="app-bar__back"
        aria-label={icon === 'close' ? '닫기' : '뒤로'}
        onClick={onBack ?? (() => navigate(-1))}
      >
        <img src={src} alt="" />
      </button>
      <h1 className="app-bar__title t-heading">{title}</h1>
      {right != null && <span className="app-bar__right t-date">{right}</span>}
      <span className="app-bar__pad" />
      {children}
    </div>
  );
}

/** 하단 탭 (책상 · 책장 · 마이페이지) */
export function TabBar({ active = 'desk' }) {
  const tabs = [
    { id: 'desk', label: '책상', icon: assets.iconDesk, to: '/' },
    { id: 'shelf', label: '책장', icon: assets.iconBooks, to: '/shelf' },
    { id: 'me', label: '마이페이지', icon: assets.iconUser, to: '/me' },
  ];
  return (
    <nav className="tab-bar" aria-label="하단 탭">
      {tabs.map((t) => (
        <Link
          key={t.id}
          to={t.to}
          className={`tab-item ${active === t.id ? 'tab-item--on' : ''}`}
          aria-current={active === t.id ? 'page' : undefined}
        >
          <span className="tab-item__icon">
            <img src={t.icon} alt="" />
          </span>
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

const STEPS = ['사진', '확인', '대화', '설정'];

/** 일기 생성 4단계 진행 표시 */
export function Progress({ step }) {
  return (
    <div className="progress" role="list" aria-label="일기 만들기 단계">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? 'done' : n === step ? 'now' : 'todo';
        return (
          <div key={label} style={{ display: 'contents' }}>
            {i > 0 && <span className={`progress__dash ${i < step ? 'progress__dash--on' : ''}`} />}
            <div
              role="listitem"
              className={`progress__step ${state === 'now' ? 'progress__step--now' : ''}`}
              aria-current={state === 'now' ? 'step' : undefined}
            >
              <span className={`progress__dot progress__dot--${state}`}>
                {state === 'done' ? <img src={assets.iconCheckSmall} alt="완료" /> : n}
              </span>
              <span>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 캡슐 버튼 */
export function Button({ variant = 'primary', icon, block, small, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} ${block ? 'btn--block' : ''} ${small ? 'btn--sm' : ''} ${className}`}
      {...rest}
    >
      {icon && <img src={icon} alt="" />}
      {children}
    </button>
  );
}

export function Chip({ on, tight, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      className={`chip ${on ? 'chip--on' : ''} ${tight ? 'chip--tight' : ''} ${className}`}
      aria-pressed={on}
      {...rest}
    >
      {children}
    </button>
  );
}

const TAPE_SRC = { sage: 'tapeSage', rose: 'tapeRose', blue: 'tapeBlue' };

/** 마스킹 테이프. 위치·크기·회전을 style 로 받는다. */
export function Tape({ color = 'sage', w = 100, h = 28, rotate = 0, style }) {
  return (
    <img
      className="tape"
      src={assets[TAPE_SRC[color]]}
      alt=""
      style={{ width: w, height: h, transform: `rotate(${rotate}deg)`, ...style }}
    />
  );
}

/** 폴라로이드. scale 로 전체 비율을 조절하고, width/photoH 로 가로형도 만든다. */
export function Polaroid({ src, caption = '', scale = 1, width, photoH, rotate = 0, style, className = '' }) {
  const css = { '--s': scale, transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style };
  if (width) css.width = width;
  return (
    <div className={`polaroid ${className}`} style={css}>
      <div className="polaroid__photo" style={photoH ? { height: photoH } : undefined}>
        <img src={src} alt="" />
      </div>
      <p className="polaroid__caption">{caption}</p>
    </div>
  );
}

/** 자치구 스탬프 */
export function Stamp({ district = '성동구', date = '2026.11.06', size = 96, rotate = 0, style }) {
  return (
    <div
      className="stamp"
      style={{ '--st': `${size}px`, transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style }}
      aria-hidden="true"
    >
      <span className="stamp__v stamp__ring">
        <img src={assets.stampOuter} alt="" />
      </span>
      <span className="stamp__v stamp__ring2">
        <img src={assets.stampInner} alt="" />
      </span>
      <span className="stamp__v stamp__line">
        <img src={assets.stampLine} alt="" />
      </span>
      <span className="stamp__t stamp__seoul">SEOUL</span>
      <span className="stamp__t stamp__district">{district}</span>
      <span className="stamp__t stamp__date">{date}</span>
    </div>
  );
}

/** 종이 이름표 (책상 위 사물 아래 붙는 손글씨 라벨) */
export function TagPaper({ label, onClick, style }) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag type={onClick ? 'button' : undefined} className="tag-paper" onClick={onClick} style={style}>
      <img src={assets.dot} alt="" />
      {label}
    </Tag>
  );
}

import { useEffect, useId, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import assets from '../assetMap.js';
import DesktopNav from '../components/DesktopNav.jsx';
import Logo from '../components/Logo.jsx';
import NoticeSheet from '../components/NoticeSheet.jsx';
import { AppBar, Polaroid, Progress, StatusBar, TabBar, Tape, WoodDesk } from '../components/common.jsx';
import useDesktop from '../hooks/useDesktop.js';
import { ERRORS, PAINT_FILTERS } from './data.js';

/** `?s=` 로 화면 상태를 미리 볼 수 있다 (디자인 검수용) */
export function usePreview() {
  const [sp] = useSearchParams();
  return sp.get('s');
}

/** 사진 한 장. 그림 변환이 끝난 사진은 필터로 그림체를 흉내 낸다. */
export function PhotoImg({ p, raw = false, className = '', style }) {
  const src = p.url || assets[p.scene || 'sceneEmpty'];
  const painted = !raw && p.conv !== 'orig' && p.conv !== 'wait' && p.conv !== 'run' && p.conv !== 'fail' && !p.original;
  const filter = painted ? PAINT_FILTERS[(p.filter || 0) % PAINT_FILTERS.length] : undefined;
  return <img className={`v3-photo ${className}`} src={src} alt="" style={{ filter, ...style }} />;
}

/**
 * 화면 틀. 모바일은 상태바 + 앱바 + 본문 + (하단 버튼) + (탭), 데스크톱은 상단 내비 + 가운데 정렬 본문.
 * side 를 주면 데스크톱에서 왼쪽에 베이지 안내 패널이 붙는다 (모바일에서는 숨김).
 */
export function Page({ title, back = 'back', onBack, right, step, tab, side, foot, bg = 'cream', children, overlay, dtitle, sideAfter, wide = false, bare = false, navActive }) {
  const desk = useDesktop();
  const navigate = useNavigate();
  const goBack = onBack ?? (() => navigate(-1));
  const hasTab = tab !== undefined && tab !== null;

  if (desk) {
    return (
      <div className={`screen screen--cream dsk-screen v3 v3--d ${bg === 'wood' ? 'v3--wood' : ''}`}>
        {bg === 'wood' && <WoodDesk />}
        {bare ? (
          <header className="dnav">
            <Logo height={44} />
          </header>
        ) : (
          <DesktopNav active={navActive || tab || 'home'} />
        )}
        <div className={`v3-d ${wide ? 'v3-d--wide' : ''}`}>
          {(title || step) && (
            <div className="v3-d__bar">
              {back && (
                <button type="button" className="v3-d__back" onClick={goBack}>
                  <img src={back === 'close' ? assets.iconClose : assets.iconBack} alt="" />
                  <span className="t-heading">{dtitle ?? title}</span>
                </button>
              )}
              {!back && <span className="t-heading">{dtitle ?? title}</span>}
              {right != null && <span className="v3-d__right">{right}</span>}
              {step && <Progress step={step} />}
            </div>
          )}
          <div className={`v3-d__grid ${side ? 'has-side' : ''}`}>
            {side && <aside className="v3-d__side">{side}</aside>}
            <main className="v3-d__main">
              <div className="v3-body">{children}</div>
              {foot && <div className="v3-foot">{foot}</div>}
            </main>
            {sideAfter}
          </div>
        </div>
        {overlay}
      </div>
    );
  }

  return (
    <div className={`screen ${bg === 'wood' ? 'screen--desk' : 'screen--cream'} v3`}>
      {bg === 'wood' && <WoodDesk />}
      <StatusBar />
      {title != null && (
        <AppBar title={title} icon={back === 'close' ? 'close' : 'back'} onBack={goBack} right={right}>
          {back === null && null}
        </AppBar>
      )}
      {step && <Progress step={step} />}
      <div className="v3-body">{children}</div>
      {foot && <div className="v3-foot">{foot}</div>}
      {hasTab && <TabBar active={tab} />}
      {overlay}
    </div>
  );
}

/** 라벨 + 입력칸 + 힌트/오류 */
export function Field({ label, error, hint, children }) {
  const id = useId();
  return (
    <div className="v3-field">
      <label className="t-caption-strong" htmlFor={id}>{label}</label>
      {typeof children === 'function' ? children(id, !!error) : children}
      {error ? (
        <p className="v3-error" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></svg>
          {error}
        </p>
      ) : (
        hint && <p className="v3-hint">{hint}</p>
      )}
    </div>
  );
}

export function Input({ id, invalid, ...rest }) {
  return <input id={id} className={`v3-input ${invalid ? 'v3-input--bad' : ''}`} aria-invalid={invalid || undefined} {...rest} />;
}

export function Toggle({ on, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={`v3-toggle ${on ? 'v3-toggle--on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

/** 공개 / 글만 / 비공개 */
export function VisSeg({ value, onChange, disabled }) {
  const opts = [['public', '공개'], ['text', '글만'], ['private', '비공개']];
  return (
    <div className="v3-vis" role="radiogroup">
      {opts.map(([k, l]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} disabled={disabled} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** 아래에서 올라오는 시트(모바일) / 가운데 카드(데스크톱) */
export function Sheet({ onClose, children, tape = true }) {
  return (
    <div className="notice v3-sheet" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="notice__card v3-sheet__card" onClick={(e) => e.stopPropagation()}>
        {tape && <Tape color="sage" w={90} h={26} rotate={-3} style={{ left: 134, top: -12 }} />}
        {children}
      </div>
    </div>
  );
}

/** API 에러 코드 → 에러 카드. actions 는 코드별 버튼 순서대로 핸들러를 받는다. */
export function ErrorCard({ code, onAction = [], onClose }) {
  const e = ERRORS[code];
  if (!e) return null;
  return (
    <NoticeSheet
      icon={e.icon}
      title={e.title}
      body={e.body}
      onClose={onClose}
      actions={e.actions.map((label, i) => ({ label, ghost: i > 0, onClick: onAction[i] || onClose }))}
    />
  );
}

/** 확인 시트 (삭제·로그아웃 등) */
export function Confirm({ icon = 'alert', title, body, ok, onOk, onCancel, danger }) {
  return (
    <NoticeSheet
      icon={icon}
      title={title}
      body={body}
      tape="rose"
      onClose={onCancel}
      actions={[{ label: ok, onClick: onOk, danger }, { label: '취소', ghost: true, onClick: onCancel }]}
    />
  );
}

export function Toast({ children, onDone, ms = 2600 }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), ms);
    return () => clearTimeout(t);
  }, [onDone, ms]);
  return (
    <div className="v3-toast" role="status">
      {children}
    </div>
  );
}

/** 1 / 4 + 이전·다음 */
export function Pager({ i, n, onPrev, onNext }) {
  return (
    <div className="v3-pager">
      <button type="button" onClick={onPrev} disabled={i <= 0} aria-label="이전 페이지"><img src={assets.iconChevronLeftBtn} alt="" /></button>
      <span className="t-stamp">{i + 1} / {n}</span>
      <button type="button" onClick={onNext} disabled={i >= n - 1} aria-label="다음 페이지"><img src={assets.iconChevronRightBtn} alt="" /></button>
    </div>
  );
}

/** 데스크톱 인증 화면: 나무 책상 위 펼친 일기장. 왼쪽은 로고와 콜라주, 오른쪽에 폼. */
export function AuthShell({ children, wide, left }) {
  return (
    <div className="screen v3 v3--auth dsk-screen">
      <WoodDesk />
      <div className="auth-book">
        <div className="auth-book__left">
          <Logo height={64} />
          {left ?? (
            <div className="auth-collage">
              <Polaroid src={assets.sceneSeongsu} caption="" scale={1.1} rotate={-6} style={{ position: 'absolute', left: 0, top: 10 }} />
              <Polaroid src={assets.sceneGyeongbok} caption="" scale={1.1} rotate={4} style={{ position: 'absolute', left: 78, top: 100 }} />
            </div>
          )}
          <p className="t-hand-small auth-book__tag">오늘의 사진이 나만의 서울 이야기가 돼요</p>
        </div>
        <div className={`auth-book__right ${wide ? 'auth-book__right--wide' : ''}`}>{children}</div>
      </div>
    </div>
  );
}

/** 파일 선택 숨김 input 을 하나 두고 열기만 하는 훅 */
export function useFilePicker(onFiles, multiple = true) {
  const ref = useRef(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      multiple={multiple}
      hidden
      onChange={(e) => {
        const fs = [...e.target.files];
        e.target.value = '';
        if (fs.length) onFiles(fs);
      }}
    />
  );
  return [() => ref.current?.click(), input];
}

export const Spinner = () => <span className="v3-spin" aria-label="진행 중" />;

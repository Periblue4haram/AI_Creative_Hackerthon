import { Tape } from './common.jsx';

const P = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: '#625548', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

/** 예외 상태 아이콘 (Figma 스크래치북 HTML 의 선 아이콘) */
export const NOTICE_ICONS = {
  pin: <svg {...P}><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>,
  user: <svg {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
  face: <svg {...P}><circle cx="12" cy="12" r="9" /><path d="M9 10v.5M15 10v.5M8.5 15a5 5 0 0 0 7 0" /></svg>,
  alert: <svg {...P}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></svg>,
  refresh: <svg {...P}><path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5" /></svg>,
  chat: <svg {...P}><path d="M4 5h16v11H9l-5 4z" /></svg>,
};

/**
 * 07 예외 상태 카드. 화면 아래에서 올라오는 시트(모바일) / 가운데 카드(데스크톱).
 * 카드 윗단에 마스킹 테이프가 붙고, 아이콘 → 제목 → 설명 → 버튼 순서.
 */
export default function NoticeSheet({ icon = 'alert', title, body, actions = [], tape = 'sage', onClose }) {
  return (
    <div className="notice" role="alertdialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="notice__card" onClick={(e) => e.stopPropagation()}>
        <Tape color={tape} w={90} h={26} rotate={-3} style={{ left: 134, top: -12 }} />
        <span className="notice__icon">{NOTICE_ICONS[icon]}</span>
        <h2 className="t-heading">{title}</h2>
        <p className="t-body">{body}</p>
        <div className="notice__actions">
          {actions.map((a) => (
            <button key={a.label} type="button" className={`btn btn--sm ${a.ghost ? 'btn--ghost' : 'btn--primary'}`} onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

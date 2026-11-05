import { Tape } from '../../components/common.jsx';
import { NOTICE_ICONS } from '../../components/NoticeSheet.jsx';
import { ERRORS } from '../data.js';
import { Page } from '../ui.jsx';

/** 09 · 에러 카드 16종 모아 보기 (검수용: /errors). 실제 화면에서는 ErrorCard 가 시트로 올라온다. */
export default function ErrorGallery() {
  return (
    <Page title="에러 카드" back="back" wide bg="cream">
      <div className="v3-errgrid">
        {Object.entries(ERRORS).map(([code, e]) => (
          <figure key={code} className="v3-errfig">
            <figcaption className="t-caption v3-muted">{code}</figcaption>
            <div className="notice__card v3-errcard">
              <Tape color="sage" w={90} h={26} rotate={-3} style={{ left: 134, top: -12 }} />
              <span className="notice__icon">{NOTICE_ICONS[e.icon]}</span>
              <h2 className="t-heading">{e.title}</h2>
              <p className="t-body">{e.body}</p>
              <div className="notice__actions">
                {e.actions.map((a, i) => (
                  <span key={a} className={`btn btn--sm ${i ? 'btn--ghost' : 'btn--primary'}`}>{a}</span>
                ))}
              </div>
            </div>
          </figure>
        ))}
      </div>
    </Page>
  );
}

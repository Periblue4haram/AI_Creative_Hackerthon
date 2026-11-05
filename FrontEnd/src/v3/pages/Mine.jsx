import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import assets from '../../assetMap.js';
import { Button, Tape } from '../../components/common.jsx';
import { VIS, dotDay, longDay } from '../data.js';
import { useApp } from '../store.jsx';
import { Confirm, ErrorCard, Page, PhotoImg, Pager, usePreview } from '../ui.jsx';

const cut = (t, n = 44) => (t.length > n ? `${t.slice(0, n)}...` : t);
const TrashIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);

/* ─────────── N1 · 내 일기 ─────────── */
export function MineList() {
  const nav = useNavigate();
  const { diary } = useApp();
  const [err, setErr] = useState(null);
  useEffect(() => {
    diary.load().then((r) => setErr(r.ok ? null : r.code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const list = diary.entries;
  return (
    <Page title="내 일기" tab="home" onBack={() => nav('/')} right={`${diary.total}편`} dtitle="내 일기" wide
      overlay={err && <ErrorCard code={err} onClose={() => setErr(null)} />}
      foot={<Button block icon={assets.iconCamera} onClick={() => nav('/create')}>일기 만들기</Button>}>
      <p className="t-caption v3-muted v3-right">최신순</p>
      {diary.loaded && list.length === 0 && <p className="v3-empty">아직 쓴 일기가 없어요. 첫 장을 만들어 보세요.</p>}
      <ul className="v3-plist v3-plist--go">
        {list.map((e) => (
          <li key={e.id}>
            <button type="button" className="v3-prow v3-prow--entry" onClick={() => nav(`/mine/${e.id}`)}>
              <span className="v3-prow__th v3-prow__th--lg"><PhotoImg p={{ url: e.thumb }} /></span>
              <span className="v3-prow__t">
                <span className="v3-badges">
                  <b className="t-body-strong">{dotDay(e.day)}</b>
                  <i className={`v3-badge ${e.public ? 'v3-badge--ok' : ''}`}>{e.public ? '공개' : '비공개'}</i>
                  <i className="v3-badge">{e.count}장</i>
                </span>
                <span className="t-caption">{cut(e.preview)}</span>
              </span>
              <img src={assets.iconChevronRight} alt="" />
            </button>
          </li>
        ))}
      </ul>
    </Page>
  );
}

/* ─────────── N2 · 일기 상세 / N2-B 차단된 페이지 / N4 삭제 확인 ─────────── */
export function MineDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const { diary } = useApp();
  const s = usePreview();
  const [sp, setSp] = useSearchParams();
  const [st, setSt] = useState({ entry: null, code: null }); // 서버에서 불러온 일기 한 편
  const [del, setDel] = useState(s === 'delete');
  const [card, setCard] = useState(null);
  useEffect(() => {
    let alive = true;
    setSt({ entry: null, code: null });
    diary.fetch(id).then((r) => alive && setSt(r.ok ? { entry: r.data, code: null } : { entry: null, code: r.code === 'NOT_FOUND' || r.code === 'FORBIDDEN' ? 'NOT_FOUND' : r.code }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const e = st.entry;
  if (st.code) return <Page title="내 일기" tab="home" overlay={<ErrorCard code={st.code} onClose={() => nav('/mine')} onAction={[() => nav('/mine')]} />}><div /></Page>;
  if (!e) return <Page title="내 일기" tab="home" onBack={() => nav('/mine')}><p className="t-caption v3-lead">불러오는 중이에요…</p></Page>;
  const i = Math.min(e.pages.length - 1, Math.max(0, Number(sp.get('p') || (s === 'blocked' ? 2 : 1)) - 1));
  const p = e.pages[i];
  const go = (k) => { const q = new URLSearchParams(sp); q.set('p', String(k + 1)); setSp(q, { replace: true }); };
  const label = VIS[p.vis];

  return (
    <Page
      title={dotDay(e.day)}
      tab="home"
      onBack={() => nav('/mine')}
      dtitle={dotDay(e.day)}
      right={
        <span className="v3-detailbar">
          <i className={`v3-badge ${e.public ? 'v3-badge--ok' : ''}`}>{e.public ? '일기 공개' : '일기 비공개'}</i>
          <button type="button" aria-label="일기 삭제" onClick={() => setDel(true)}><TrashIcon /></button>
        </span>
      }
      wide
      overlay={<>{card && <ErrorCard code={card} onClose={() => setCard(null)} />}{del && (
        <Confirm title="이 일기를 삭제할까요?" body="페이지, 대화, 반응, 신고, 이미지가 모두 지워지고 되돌릴 수 없어요." ok="삭제" onCancel={() => setDel(false)} onOk={async () => { const r = await diary.remove(e.id); setDel(false); if (r.ok) nav('/mine', { replace: true }); else setCard(r.code); }} />
      )}</>}
      foot={
        <>
          <Pager i={i} n={e.pages.length} onPrev={() => go(i - 1)} onNext={() => go(i + 1)} />
          <Button block variant="ghost" icon={assets.iconEdit} onClick={() => nav(`/mine/${e.id}/edit/${i + 1}`)}>글 수정</Button>
        </>
      }
    >
      <div className="v3-detail-row">
        <span className="t-body-strong">페이지 {i + 1}</span>
        <span className="t-caption v3-muted">/ {e.pages.length} · {label}</span>
        <button type="button" className="btn btn--sm btn--ghost v3-detail-vis" onClick={() => nav(`/mine/${e.id}/visibility`)}>공개 범위 변경</button>
      </div>
      {p.blocked && <p className="v3-blocked t-caption" role="note">신고가 쌓여 차단된 페이지예요. 나에게는 계속 보이지만 다시 공개할 수 없어요.</p>}
      <div className="v3-prev">
        <div className="v3-prev__meta"><span className="t-date">{longDay(e.day)}</span><span className="t-caption">{p.gu === 'unknown' ? '위치 모름' : p.gu}</span></div>
        <div className="v3-prev__frame">
          <Tape color="sage" w={80} h={24} rotate={-4} style={{ left: 28, top: -10 }} />
          <PhotoImg p={p} className="v3-prev__img" />
        </div>
        <p className="v3-prev__text t-body">{p.text}</p>
      </div>
    </Page>
  );
}


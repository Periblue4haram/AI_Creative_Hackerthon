import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import assets from '../../assetMap.js';
import { Button } from '../../components/common.jsx';
import useDesktop from '../../hooks/useDesktop.js';
import { GUS, REPORT_REASONS, SEED_DIARIES, SEED_FEED, mdDay } from '../data.js';
import { useApp } from '../store.jsx';
import { ErrorCard, Page, PhotoImg, Sheet, usePreview } from '../ui.jsx';

const ALL = '전체';
const cut = (t, n = 64) => (t.length > n ? `${t.slice(0, n)}...` : t);
const ThumbUp = ({ on }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.8 9H19a2 2 0 0 1 2 2.4l-1.3 6.5a2 2 0 0 1-2 1.6H7" /></svg>
);
const ThumbDown = ({ on }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" style={{ transform: 'scaleY(-1)' }}><path d="M7 11v9H4v-9zM7 11l4-7c1.5 0 2.5 1 2.2 2.6L12.8 9H19a2 2 0 0 1 2 2.4l-1.3 6.5a2 2 0 0 1-2 1.6H7" /></svg>
);
const Flag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
);

/** 신고 흐름: 내 페이지 / 이미 신고 / 신고 시트 */
function useReport() {
  const { social } = useApp();
  const s = usePreview();
  const [target, setTarget] = useState(s === 'report' ? { id: 'preview', mine: false } : null);
  const [card, setCard] = useState(null);
  const open = (item) => {
    if (item.mine) return setCard('CANNOT_REPORT_OWN_PAGE');
    if (social.isReported(item.id)) return setCard('ALREADY_REPORTED');
    setTarget(item);
  };
  const overlay = (
    <>
      {card && <ErrorCard code={card} onClose={() => setCard(null)} />}
      {target && (
        <ReportSheet
          onClose={() => setTarget(null)}
          onSend={() => {
            if (target) social.report(target.id);
            setTarget(null);
          }}
        />
      )}
    </>
  );
  return [open, overlay];
}

function ReportSheet({ onClose, onSend }) {
  const [why, setWhy] = useState('');
  const [more, setMore] = useState('');
  const close = onClose;
  return (
    <Sheet onClose={close}>
      <h2 className="t-heading">이 페이지를 신고할까요?</h2>
      <p className="t-caption v3-muted">신고는 페이지마다 한 번만 할 수 있어요.</p>
      <div className="chip-row">
        {REPORT_REASONS.map((r) => (
          <button key={r} type="button" className={`chip chip--tight ${why === r ? 'chip--on' : ''}`} aria-pressed={why === r} onClick={() => setWhy(r)}>{r}</button>
        ))}
      </div>
      <textarea className="v3-textarea v3-textarea--sm" placeholder="자세한 내용 (선택, 500자 이하)" maxLength={500} value={more} onChange={(e) => setMore(e.target.value)} aria-label="신고 내용" />
      <div className="notice__actions">
        <button type="button" className="btn btn--sm btn--primary" disabled={!why} onClick={onSend}>신고하기</button>
        <button type="button" className="btn btn--sm btn--ghost" onClick={close}>취소</button>
      </div>
    </Sheet>
  );
}

/** 피드 카드 한 장 (좋아요/싫어요 수는 보여 주지 않는다) */
function FeedCard({ item, onOpen, onReport }) {
  const { social } = useApp();
  const r = social.reaction(item.id);
  return (
    <article className="v3-feed">
      <button type="button" className="v3-feed__main" onClick={onOpen}>
        <span className="v3-feed__head"><b className="t-body-strong">{item.nick}</b><span className="t-caption v3-muted">{mdDay(item.day)}</span></span>
        {item.vis === 'public' && item.scene ? <PhotoImg p={item} className="v3-feed__img" /> : <i className="v3-badge v3-feed__tag">글만 공개한 페이지</i>}
        <span className="t-body v3-feed__text">{cut(item.text)}</span>
      </button>
      <div className="v3-feed__act">
        <button type="button" className={r === 'like' ? 'on' : ''} aria-pressed={r === 'like'} onClick={() => social.react(item.id, 'like')}><ThumbUp on={r === 'like'} /> 좋아요</button>
        <button type="button" className={r === 'dislike' ? 'on' : ''} aria-pressed={r === 'dislike'} onClick={() => social.react(item.id, 'dislike')}><ThumbDown on={r === 'dislike'} /> 싫어요</button>
        <button type="button" className="v3-feed__flag" aria-label="신고" onClick={() => onReport(item)}><Flag /></button>
      </div>
    </article>
  );
}

/** 내 일기에서 공개된 페이지도 피드에 섞여 보인다 */
function useFeed() {
  const { diary, db, auth } = useApp();
  return useMemo(() => {
    const mine = diary.entries.filter((e) => e.public).flatMap((e) =>
      e.pages.filter((p) => !p.blocked && (p.vis === 'public' || p.vis === 'text')).map((p) => ({ id: p.id, nick: auth.me?.nick || '나', day: e.day, gu: p.gu, text: p.text, scene: p.scene, url: p.url, original: p.original, vis: p.vis, diary: e.id, mine: true })),
    );
    const seedIds = new Set(SEED_FEED.filter((f) => f.mine).map((f) => f.id));
    const others = SEED_FEED.filter((f) => !f.mine && !seedIds.has(f.id));
    return [...others, ...mine].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.entries, auth.me?.nick]);
}

const SPINES = ['#b99b7a', '#8c7256', '#a9b49a', '#d9b3a3', '#6e4f3a', '#a3825f'];
function Shelf({ onPick }) {
  return (
    <div className="v3-shelf" role="list">
      <div className="v3-shelf__books">
        {[ALL, ...GUS].map((g, i) => (
          <button key={g} type="button" role="listitem" className="v3-spine" style={{ '--c': SPINES[i], height: 150 + ((i * 17) % 28) }} onClick={() => onPick(g)} aria-label={`${g} 일기 보기`}>
            <span>{g}</span>
          </button>
        ))}
      </div>
      <i className="v3-shelf__plank" />
    </div>
  );
}

function SearchBox({ q, setQ, onGo }) {
  return (
    <form className="v3-search" onSubmit={(e) => { e.preventDefault(); onGo(q.trim()); }}>
      <img src={assets.iconSearch} alt="" />
      <input placeholder="어떤 일기를 찾고 있나요?" value={q} onChange={(e) => setQ(e.target.value)} aria-label="AI 검색" />
      <button type="submit" className="v3-send" aria-label="검색"><img src={assets.iconSparkle} alt="" /></button>
    </form>
  );
}

/* ─────────── S1 · 구 고르기 ─────────── */
export function SocialHome() {
  const nav = useNavigate();
  const desk = useDesktop();
  const [q, setQ] = useState('');
  const go = (t) => t && nav(`/social/search?q=${encodeURIComponent(t)}`);
  return (
    <Page title="소셜 다이어리" back={null} tab="social" bg={desk ? 'wood' : 'cream'}>
      <div className="v3-social-home">
        <p className="v3-sub v3-sub--left">구를 고르거나 AI로 비슷한 일기를 찾아보세요</p>
        <SearchBox q={q} setQ={setQ} onGo={go} />
        <Shelf onPick={(g) => nav(`/social/${g}`)} />
        <p className="t-caption v3-muted v3-center">고른 구에서 쓴 페이지만 모아 보여 줘요.</p>
      </div>
    </Page>
  );
}

/* ─────────── S2 · 구별 일기 목록 ─────────── */
export function SocialList() {
  const nav = useNavigate();
  const { gu = ALL } = useParams();
  const feed = useFeed();
  const [report, overlay] = useReport();
  const [q, setQ] = useState('');
  const list = feed.filter((f) => gu === ALL || f.gu === gu);
  const side = (
    <>
      <h2 className="t-heading">소셜 다이어리</h2>
      <SearchBox q={q} setQ={setQ} onGo={(t) => t && nav(`/social/search?q=${encodeURIComponent(t)}`)} />
      <ul className="v3-gulist">
        {[ALL, ...GUS].map((g) => (
          <li key={g}><button type="button" className={g === gu ? 'on' : ''} onClick={() => nav(`/social/${g}`, { replace: true })}>{g}</button></li>
        ))}
      </ul>
    </>
  );
  return (
    <Page title={gu} onBack={() => nav('/social')} tab="social" side={side} overlay={overlay} dtitle={gu}>
      {list.length === 0 && <p className="v3-empty">아직 공개된 일기가 없어요.</p>}
      <div className="v3-feedlist">
        {list.map((f) => <FeedCard key={f.id} item={f} onOpen={() => nav(`/social/diary/${f.diary}`)} onReport={report} />)}
      </div>
    </Page>
  );
}

/* ─────────── S3 · 일기 상세 ─────────── */
export function SocialDiary() {
  const nav = useNavigate();
  const { id } = useParams();
  const { diary, social, auth } = useApp();
  const [report, overlay] = useReport();
  const own = diary.get(id);
  const d = own
    ? { nick: auth.me?.nick, day: own.day, gu: own.pages[0]?.gu, pages: own.pages.filter((p) => !p.blocked && (p.vis === 'public' || p.vis === 'text')), mine: true }
    : SEED_DIARIES[id];
  if (!d) return <Page title="소셜 다이어리" tab="social" overlay={<ErrorCard code="NOT_FOUND" onClose={() => nav('/social')} onAction={[() => nav('/social')]} />}><div /></Page>;
  return (
    <Page title={`${d.nick}의 일기`} onBack={() => nav(-1)} tab="social" overlay={overlay} wide>
      <p className="t-caption v3-muted">{mdDay(d.day)} · {d.gu} · 시간순 페이지</p>
      <div className="v3-feedlist">
        {d.pages.map((p) => {
          const r = social.reaction(p.id);
          return (
            <article key={p.id} className="v3-feed v3-feed--page">
              {p.vis === 'public' && (p.scene || p.url) && <PhotoImg p={p} className="v3-feed__img" />}
              {p.vis !== 'public' && <i className="v3-badge v3-feed__tag">글만 공개한 페이지</i>}
              <p className="t-body">{p.text}</p>
              <div className="v3-feed__act">
                <button type="button" className={r === 'like' ? 'on' : ''} aria-pressed={r === 'like'} onClick={() => social.react(p.id, 'like')}><ThumbUp on={r === 'like'} /> 좋아요</button>
                <button type="button" className={r === 'dislike' ? 'on' : ''} aria-pressed={r === 'dislike'} onClick={() => social.react(p.id, 'dislike')}><ThumbDown on={r === 'dislike'} /> 싫어요</button>
                <button type="button" className="v3-feed__flag" aria-label="신고" onClick={() => report({ id: p.id, mine: !!d.mine })}><Flag /></button>
              </div>
            </article>
          );
        })}
      </div>
    </Page>
  );
}

/** 간단한 의미 검색 흉내: 글자 2개 단위(바이그램) 겹침 + 몇 가지 개념어 확장. 실제 검색은 서버(AI)가 한다. */
const STOP = new Set(['에서', '하는', '했다', '있는', '이다', '으로']);
const grams = (t) => {
  const c = t.replace(/[^가-힣a-z0-9]/gi, '');
  const out = new Set();
  for (let i = 0; i < c.length - 1; i += 1) if (!STOP.has(c.slice(i, i + 2))) out.add(c.slice(i, i + 2));
  return out;
};
const CONCEPTS = [
  [/비 |비$|우산|장마|빗/, /비가|비 냄새|우산|젖은|처마|빗방울/, 3],
  [/걷|산책|걸/, /걸었|걷는|골목|길을|산책/, 2],
  [/노을|석양/, /노을/, 2],
  [/카페|커피|라테/, /카페|라테|커피|차를/, 2],
  [/책|독서|소설/, /소설|책|서점/, 2],
  [/혼자/, /혼자/, 1],
];
function searchFeed(q, feed) {
  const g = grams(q);
  return feed
    .map((f) => {
      const t = grams(f.text);
      let n = 0;
      g.forEach((x) => t.has(x) && (n += 1));
      CONCEPTS.forEach(([qr, tr, w]) => qr.test(q) && tr.test(f.text) && (n += w));
      return [f, n];
    })
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([f]) => f);
}

/* ─────────── S4 · AI 검색 결과 ─────────── */
export function SocialSearch() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const s = usePreview();
  const q0 = sp.get('q') || (s === 'empty' ? '우주 정거장에서 먹은 라면' : '비 오는 날 혼자 걷기 좋은 곳');
  const [q, setQ] = useState(q0);
  const [gu, setGu] = useState(ALL);
  const feed = useFeed();
  const [report, overlay] = useReport();
  const [fail, setFail] = useState(s === 'aifail');
  const rows = searchFeed(q0, feed).filter((f) => gu === ALL || f.gu === gu);
  return (
    <Page title="AI 검색" onBack={() => nav('/social')} tab="social" wide overlay={<>{overlay}{fail && <ErrorCard code="SEARCH_AI_UNAVAILABLE" onClose={() => setFail(false)} onAction={[() => setFail(false), () => nav('/social')]} />}</>}>
      <SearchBox q={q} setQ={setQ} onGo={(t) => t && setSp({ q: t })} />
      <div className="chip-row v3-chips">
        {[ALL, ...GUS].map((g) => (
          <button key={g} type="button" className={`chip chip--tight ${g === gu ? 'chip--on' : ''}`} aria-pressed={g === gu} onClick={() => setGu(g)}>{g}</button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="v3-empty">
          <b className="t-heading">비슷한 일기가 없어요</b>
          <p className="t-body">다른 말로 찾아보거나 구를 바꿔 보세요.</p>
          <Button small variant="ghost" onClick={() => nav('/social')}>구로 둘러보기</Button>
        </div>
      ) : (
        <div className="v3-feedlist">
          {rows.map((f) => <FeedCard key={f.id} item={f} onOpen={() => nav(`/social/diary/${f.diary}`)} onReport={report} />)}
        </div>
      )}
    </Page>
  );
}

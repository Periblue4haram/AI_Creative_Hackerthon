import { useNavigate } from 'react-router-dom';
import assets from '../../assetMap.js';
import DesktopNav from '../../components/DesktopNav.jsx';
import HomeHeader from '../../components/HomeHeader.jsx';
import { Button, Polaroid, TabBar, Tape, TagPaper, WoodDesk } from '../../components/common.jsx';
import { DiaryClosed } from '../../components/objects.jsx';
import useDesktop from '../../hooks/useDesktop.js';
import { GUS, dowDay, shortDay } from '../data.js';
import { useApp } from '../store.jsx';

const cut = (t, n = 38) => (t.length > n ? `${t.slice(0, n)}...` : t);

/** H1·H2 홈. 닫힌 일기장 + 일기 만들기. 일기가 있으면 "지난 일기" 카드가 위에 붙는다. */
export default function Home() {
  const nav = useNavigate();
  const desk = useDesktop();
  const { diary } = useApp();
  const list = diary.entries;
  const last = list[0];
  const count = list.length;
  const lastGu = last?.pages[0]?.gu;
  const lastLine = last ? `마지막 ${shortDay(last.day)} · ${lastGu}` : '첫 장을 기다려요';
  const lastLabel = last ? `${shortDay(last.day)} (${dowDay(last.day)}) · ${lastGu}` : '';

  const book = (scale) => (
    <button type="button" className="obj-btn v3-book" onClick={() => nav('/mine')} aria-label="내 일기 펼치기">
      <DiaryClosed scale={scale} count={`내 일기 ${count}편`} lastEntry={lastLine} />
    </button>
  );

  if (desk) {
    return (
      <div className="screen screen--desk dsk-screen v3 v3-home v3-home--d">
        <WoodDesk />
        <DesktopNav active="home" />
        <div className="v3-home__grid">
          <div className="v3-home__col">
            <div className="note v3-note" style={{ transform: 'rotate(-1.5deg)' }}>
              <Tape color="sage" w={92} h={26} rotate={-2} style={{ left: 120, top: -12 }} />
              <h2 className="t-title">오늘은 어떤 하루였나요?</h2>
              <p className="t-body">{last ? '사진을 올려 그림일기가 시작돼요.' : <>아직 쓴 일기가 없어요.<br />사진을 올려 첫 장을 채워 보세요.</>}</p>
            </div>
            <Button icon={assets.iconCamera} onClick={() => nav('/create')}>일기 만들기</Button>
            {list.length > 1 && (
              <div className="v3-home__polas">
                {list.slice(0, 2).map((e, i) => (
                  <Polaroid key={e.id} src={assets[e.pages[0].scene || 'sceneEmpty']} caption={`${shortDay(e.day)} · ${e.pages[0].gu}`} scale={0.74} rotate={i ? 4 : -4} />
                ))}
              </div>
            )}
          </div>
          <div className="v3-home__col v3-home__col--mid">
            {book(1.3)}
            {last && <TagPaper label="내 일기 펼치기" onClick={() => nav('/mine')} />}
          </div>
          <div className="v3-home__col v3-home__col--right">
            <div className="note v3-social-card">
              <h3 className="t-body-strong">소셜 다이어리</h3>
              <p className="t-caption">다른 사람들은 어떤 서울을 걸었을까요?</p>
              <div className="chip-row">
                {GUS.map((g) => (
                  <button key={g} type="button" className="chip chip--tight" onClick={() => nav(`/social/${g}`)}>{g}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen--desk screen--fixed v3 v3-home">
      <WoodDesk />
      <HomeHeader />
      <div className="v3-home__layer">
        {last ? (
          <button type="button" className="v3-last" onClick={() => nav(`/mine/${last.id}`)}>
            <img src={assets[last.pages[0].scene || 'sceneEmpty']} alt="" />
            <span className="v3-last__t">
              <b className="t-caption">지난 일기 · {lastLabel}</b>
              <span className="t-caption">{cut(last.pages[0].text, 46)}</span>
            </span>
            <img className="v3-last__go" src={assets.iconChevronRight} alt="" />
          </button>
        ) : (
          <div className="note v3-note" style={{ transform: 'rotate(2deg)' }}>
            <Tape color="sage" w={92} h={26} rotate={3} style={{ left: 102, top: -12 }} />
            <h2 className="t-title">오늘은 어떤 하루였나요?</h2>
            <p className="t-body">아직 쓴 일기가 없어요.<br />사진을 올려 첫 장을 채워 보세요.</p>
          </div>
        )}
        <div className="v3-home__book">
          <div style={{ transform: 'rotate(3deg)' }}>{book(1)}</div>
          {last && <TagPaper label="내 일기 펼치기" onClick={() => nav('/mine')} style={{ position: 'absolute', right: 26, bottom: 14, transform: 'rotate(2deg)' }} />}
        </div>
        <Button block icon={assets.iconCamera} className="v3-home__cta" onClick={() => nav('/create')}>일기 만들기</Button>
      </div>
      <TabBar active="home" />
    </div>
  );
}

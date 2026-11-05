import { useNavigate } from 'react-router-dom';
import assets from '../assetMap.js';
import HomeHeader from '../components/HomeHeader.jsx';
import { Button, TabBar, Tape, TagPaper, WoodDesk } from '../components/common.jsx';
import { DiaryClosed, Pencil, ScrollMap } from '../components/objects.jsx';
import { ENTRIES } from '../data/mock.js';
import { shortDate } from '../utils/date.js';
import DesktopNav from '../components/DesktopNav.jsx';
import { MetroTicket } from '../components/objects.jsx';
import { Polaroid } from '../components/common.jsx';
import { SCENES } from '../data/mock.js';
import useDesktop from '../hooks/useDesktop.js';

/** 홈 A · 위에서 본 책상. 일기장을 누르면 내 일기, 두루마리를 누르면 지도, CTA 는 오늘 페이지를 펼친다. */
export default function Home() {
  const navigate = useNavigate();
  const wide = useDesktop();
  const last = ENTRIES[0];
  const lastLabel = last ? `마지막 ${shortDate(last.date).split(' ')[0]} · ${last.place}` : '아직 기록이 없어요';

  if (wide) {
    return (
      <div className="screen screen--desk dsk-screen">
        <WoodDesk />
        <DesktopNav active="desk" />
        <div className="home-d">
          <div className="home-d__left">
            <div className="note" style={{ position: 'relative', transform: 'rotate(-1deg)' }}>
              <h2 className="t-title">오늘은 어떤 하루였나요?</h2>
              <p className="t-body">오늘 쓴 일기가 아직 없어요.<br />일기장을 펼쳐 첫 장을 채워 보세요.</p>
              <Tape color="sage" w={92} h={26} rotate={3} style={{ left: 120, top: -12 }} />
            </div>
            <div className="home-d__polas">
              {ENTRIES.slice(0, 2).map((e, i) => (
                <Polaroid key={e.id} src={assets[SCENES[e.scene]]} caption={`${shortDate(e.date).split(' ')[0]} · ${e.place}`} scale={0.62} rotate={i ? 3 : -3} />
              ))}
            </div>
            <div className="home-d__small">
              <MetroTicket />
              <Pencil />
            </div>
          </div>
          <div className="home-d__mid">
            <button type="button" className="obj-btn obj-btn--flow" onClick={() => navigate('/diary')} aria-label="내 일기장 열기">
              <DiaryClosed scale={1.3} count={`내 일기장 · ${ENTRIES.length}편`} lastEntry={lastLabel} />
            </button>
            <TagPaper label="일기장 펼치기 · Enter" onClick={() => navigate('/diary')} />
            <Button icon={assets.iconCamera} onClick={() => navigate('/today')}>오늘 일기 쓰기</Button>
          </div>
          <div className="home-d__right">
            <button type="button" className="obj-btn obj-btn--flow" onClick={() => navigate('/map')} aria-label="서울 지도 펼치기">
              <ScrollMap />
            </button>
            <TagPaper label="서울 지도 펼치기" onClick={() => navigate('/map')} />
            <div className="note note--stamp">
              <p className="t-body-strong">11월의 기록</p>
              <p className="t-caption">일기 4편 · 3개 구<br />성동구 · 종로구 · 용산구</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen--desk screen--fixed">
      <WoodDesk />
      <HomeHeader />

      <div className="home-layer">
        <div className="note" style={{ left: 30.2, top: 154, transform: 'rotate(2.5deg)' }}>
          <h2 className="t-title">오늘은 어떤 하루였나요?</h2>
          <p className="t-body">
            오늘 쓴 일기가 아직 없어요.
            <br />
            일기장을 펼쳐 첫 장을 채워 보세요.
          </p>
          <Tape color="sage" w={92} h={26} rotate={3} style={{ left: 102.6, top: -12 }} />
        </div>

        <button
          type="button"
          className="obj-btn"
          style={{ left: 19.78, top: 314, width: 255.9, height: 322.1 }}
          onClick={() => navigate('/diary')}
          aria-label="내 일기장 열기"
        >
          <div style={{ transform: 'rotate(3deg)' }}>
            <DiaryClosed count={`내 일기장 · ${ENTRIES.length}편`} lastEntry={lastLabel} />
          </div>
        </button>

        <button
          type="button"
          className="obj-btn"
          style={{ left: 296, top: 294.56, width: 98.7, height: 304.7 }}
          onClick={() => navigate('/map')}
          aria-label="서울 지도 펼치기"
        >
          <div style={{ transform: 'rotate(4deg)' }}>
            <ScrollMap />
          </div>
        </button>

        <TagPaper
          label="내 일기장 펼치기"
          onClick={() => navigate('/diary')}
          style={{ position: 'absolute', left: 68.74, top: 640, transform: 'rotate(2deg)' }}
        />
        <TagPaper
          label="서울 지도"
          onClick={() => navigate('/map')}
          style={{ position: 'absolute', left: 268, top: 614.19, transform: 'rotate(-4deg)' }}
        />

        <div className="obj-static" style={{ left: 300, top: 674.57, width: 172, height: 80.4 }}>
          <div style={{ transform: 'rotate(-25deg)' }}>
            <Pencil />
          </div>
        </div>

        <Button
          className="home-cta"
          style={{ left: 110, top: 690 }}
          icon={assets.iconPlusCream}
          onClick={() => navigate('/today')}
        >
          오늘 일기 쓰기
        </Button>
      </div>

      <div style={{ flex: 1 }} />
      <TabBar active="desk" />
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import assets from '../assetMap.js';
import HomeHeader from '../components/HomeHeader.jsx';
import { Polaroid, TabBar, Tape, TagPaper, WoodDesk } from '../components/common.jsx';
import { ENTRIES, MAX_PHOTOS, SCENES } from '../data/mock.js';
import { fullDate, shortDate } from '../utils/date.js';
import DesktopNav from '../components/DesktopNav.jsx';
import { ScrollMap } from '../components/objects.jsx';
import { Button } from '../components/common.jsx';
import useDesktop from '../hooks/useDesktop.js';

/** 홈 B · 오늘 페이지가 펼쳐진 일기장. 사진 올리기 영역을 누르면 일기 만들기가 시작된다. */
export default function Today() {
  const navigate = useNavigate();
  const wide = useDesktop();
  const last = ENTRIES[0];

  if (wide) {
    return (
      <div className="screen screen--desk dsk-screen">
        <WoodDesk />
        <DesktopNav active="desk" />
        <div className="today-d">
          <div className="today-d__map">
            <button type="button" className="obj-btn obj-btn--flow" onClick={() => navigate('/map')} aria-label="서울 지도 펼치기">
              <ScrollMap />
            </button>
            <TagPaper label="서울 지도 · 5개 구" onClick={() => navigate('/map')} />
          </div>
          <div className="open-diary today-d__book">
            <div className="open-diary__stitch" />
            <div className="open-diary__page">
              <img className="open-diary__lines" src={assets.linedPaper} alt="" />
              <div className="today-d__cols">
                <section className="today-d__recent">
                  <h2 className="t-heading">최근 일기</h2>
                  <p className="t-caption">지난 이야기를 넘겨 볼 수 있어요</p>
                  <div className="home-d__polas">
                    {ENTRIES.slice(0, 2).map((e, i) => (
                      <Polaroid key={e.id} src={assets[SCENES[e.scene]]} caption={`${shortDate(e.date).split(' ')[0]} · ${e.place}`} scale={0.6} rotate={i ? 3 : -2} />
                    ))}
                  </div>
                  {last && <h3 className="t-hand-note">{last.title}</h3>}
                  <button type="button" className="btn btn--ghost" onClick={() => navigate('/diary')}>
                    <img src={assets.iconChevronRight} alt="" />지난 일기 넘겨 보기
                  </button>
                </section>
                <section className="today-d__new">
                  <div className="page-content__date">
                    <span className="t-date">{fullDate(new Date())}</span>
                    <span className="badge-today t-hand-small">오늘</span>
                  </div>
                  <h2 className="t-title">오늘의 일기</h2>
                  <button type="button" className="dropzone dropzone--wide" onClick={() => navigate('/new/photos')}>
                    <span className="dropzone__cam"><img src={assets.iconCamera} alt="" style={{ width: 28.8, height: 28.8 }} /></span>
                    <span className="t-body-strong">사진을 끌어다 놓거나 클릭해서 시작</span>
                    <span className="t-caption">1~{MAX_PHOTOS}장 · 사진 위치로 동네를 찾아요</span>
                    <Button icon={assets.iconPlusCream} tabIndex={-1}>사진 고르기</Button>
                  </button>
                </section>
              </div>
            </div>
            <span className="bookmark" aria-hidden="true" />
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
        <TagPaper
          label="서울 지도 · 5개 구 다녀옴"
          onClick={() => navigate('/map')}
          style={{ position: 'absolute', left: 150, top: 111.8, transform: 'rotate(-3deg)', zIndex: 3 }}
        />

        <div className="open-diary" style={{ position: 'absolute', left: 14, top: 168, width: 362, height: 566 }}>
          <div className="open-diary__stitch" />
          <div className="open-diary__page" style={{ left: 14, top: 12, width: 336, height: 542, right: 'auto', bottom: 'auto' }}>
            <img className="open-diary__lines" src={assets.linedPaper} alt="" />
            <div className="page-content">
              <div className="page-content__date">
                <span className="t-date">{fullDate(new Date())}</span>
                <span className="badge-today t-hand-small">오늘</span>
              </div>
              <h2 className="t-title" style={{ whiteSpace: 'nowrap' }}>
                오늘은 어떤 하루였나요?
              </h2>
              <p className="t-body">사진을 올리면 동네를 찾아 짧게 대화하고, 그림일기를 그려 드려요.</p>

              <button type="button" className="dropzone" onClick={() => navigate('/new/photos')}>
                <span className="dropzone__cam">
                  <img src={assets.iconCamera} alt="" style={{ width: 28.8, height: 28.8 }} />
                </span>
                <span className="t-body-strong">사진 올리고 오늘의 일기 시작</span>
                <span className="t-caption">1~{MAX_PHOTOS}장 · 사진 위치로 동네를 찾아요</span>
                <Tape color="sage" w={64} h={20} rotate={30} style={{ left: -25.5 + 0.7, top: 2.5 + 14.6 }} />
                <Tape color="rose" w={64} h={20} rotate={-28} style={{ left: 240.5 + 0.8, top: -33.55 + 13.8 }} />
              </button>

              {last && (
                <button type="button" className="prev-link" onClick={() => navigate('/diary')}>
                  <span className="prev-link__thumb">
                    <Polaroid src={assets[SCENES[last.scene]]} scale={0.42} rotate={4} />
                  </span>
                  <span className="prev-link__text">
                    <span className="t-caption">지난 일기 · {shortDate(last.date)}</span>
                    <span className="t-hand-note">{last.title}</span>
                  </span>
                  <img src={assets.iconChevronRight} alt="" style={{ width: 24, height: 24 }} />
                </button>
              )}
            </div>
          </div>
          <span className="bookmark" aria-hidden="true" />
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <TabBar active="desk" />
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import assets from '../assetMap.js';
import HomeHeader from '../components/HomeHeader.jsx';
import { Button, TabBar, WoodDesk } from '../components/common.jsx';
import { DISTRICTS, MAP_ROWS } from '../data/mock.js';

const info = (short) => DISTRICTS.find((d) => d.name === `${short}구`) ?? null;

/** 03 서울 지도 팝업: 두루마리 지도에서 구를 누르면 아래 카드에 요약이 뜨고, 책 펼치기로 이어진다. */
export default function MapPopup() {
  const navigate = useNavigate();
  const [sel, setSel] = useState('성동');
  const d = info(sel);
  const visited = DISTRICTS.filter((x) => x.mine > 0).length;
  const total = DISTRICTS.reduce((n, x) => n + x.mine, 0);

  return (
    <div className="screen screen--desk screen--fixed">
      <WoodDesk />
      <HomeHeader />
      <div className="map-dim" />
      <button type="button" className="map-close" aria-label="지도 닫기" onClick={() => navigate('/')}>
        <img src={assets.iconClose} alt="" />
      </button>

      <section className="map-scroll" aria-label="서울 지도">
        <span className="map-scroll__rod map-scroll__rod--top" />
        <div className="map-scroll__paper">
          <h2 className="t-title">서울 지도</h2>
          <p className="t-caption">{visited}개 구 다녀옴 · {total}편</p>
          <div className="map-grid">
            <img className="map-grid__river" src={assets.miniMap} alt="" />
            {MAP_ROWS.map((row, r) => (
              <div className="map-grid__row" key={r}>
                {row.map((name, c) =>
                  name ? (
                    <button
                      key={name}
                      type="button"
                      className={`map-cell ${info(name)?.mine ? 'map-cell--has' : ''} ${sel === name ? 'map-cell--sel' : ''}`}
                      aria-pressed={sel === name}
                      onClick={() => setSel(name)}
                    >
                      {name}
                      {info(name)?.mine > 0 && <small>{info(name).mine}편</small>}
                    </button>
                  ) : (
                    <span key={c} className="map-cell map-cell--blank" />
                  ),
                )}
              </div>
            ))}
          </div>
          <div className="map-legend t-caption">
            <span><i className="map-legend__on" />일기 있음</span>
            <span><i />아직 없음</span>
          </div>
          <p className="t-body">구를 누르면 그 동네 책을 펼칠 수 있어요</p>
        </div>
        <span className="map-scroll__rod" />
      </section>

      {d && (
        <section className="map-card">
          <h3 className="t-heading">{d.name}</h3>
          <p className="t-caption">내 일기 {d.mine}편 · 모두의 일기 {d.all}편</p>
          <Button block onClick={() => navigate(`/book/${d.name}`)}>
            {d.name} 책 펼치기
            <img src={assets.iconChevronRight} alt="" style={{ filter: 'brightness(5)' }} />
          </Button>
        </section>
      )}
      <div style={{ flex: 1 }} />
      <TabBar active="desk" />
    </div>
  );
}

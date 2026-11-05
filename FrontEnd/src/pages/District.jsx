import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import assets from '../assetMap.js';
import { AppBar, Button, PaperGrain, Polaroid, StatusBar, TabBar, Tape } from '../components/common.jsx';
import { DISTRICTS, ENTRIES, SCENES } from '../data/mock.js';
import { fullDate } from '../utils/date.js';

const BLURB = {
  성동구: '붉은 벽돌 공장과 카페가 이어지는 동네. 서울숲과 한강을 함께 걷기 좋아요.',
  금천구: '아직 이 동네의 이야기가 없어요. 다른 사람들의 일기로 먼저 만나 보세요.',
};

/** 12 자치구 책: "내 일기 / 모두의 일기" 탭 · 12-E 빈 책 */
export default function District() {
  const { name = '성동구' } = useParams();
  const navigate = useNavigate();
  const d = DISTRICTS.find((x) => x.name === name) ?? { name, mine: 0, all: 0 };
  const [tab, setTab] = useState('mine');
  const mine = ENTRIES.filter((e) => e.district === name).slice(0, d.mine || 0);
  const list = tab === 'mine' ? mine : ENTRIES.slice(0, 3);

  return (
    <div className="screen screen--cream screen--fixed">
      <PaperGrain />
      <StatusBar />
      <AppBar title={`${name} 책`} onBack={() => navigate('/shelf')}>
        <button type="button" className="app-bar__map" aria-label="서울 지도 보기" onClick={() => navigate('/map')}>
          <img src={assets.iconMap} alt="" />
        </button>
      </AppBar>
      <header className="district-head">
        <h1 className="t-title">{name}</h1>
        <p className="t-body">{BLURB[name] ?? `${name}에서 남긴 일기들이에요.`}</p>
      </header>

      <div className="district-body">
        <div className="seg" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'seg--on' : ''} onClick={() => setTab('mine')}>
            내 일기 {d.mine}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'seg--on' : ''} onClick={() => setTab('all')}>
            모두의 일기 {d.all}
          </button>
        </div>

        {list.length > 0 ? (
          <ul className="entry-list">
            {list.map((e) => (
              <li key={e.id}>
                <button type="button" className="entry-row" onClick={() => navigate('/diary')}>
                  <span className="entry-row__thumb"><img src={assets[SCENES[e.scene]]} alt="" /></span>
                  <span className="entry-row__text">
                    <span className="t-date">{fullDate(e.date).split(' ')[0]}</span>
                    <span className="t-body-strong">{e.title}</span>
                    <span className="t-caption entry__place"><img src={assets.iconPinSmall} alt="" />{e.place}</span>
                  </span>
                  <img src={assets.iconChevronRight} alt="" style={{ width: 24, height: 24 }} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="district-empty">
            <div className="empty-state__polaroid" style={{ height: 170 }}>
              <Polaroid src={assets.sceneEmpty} caption={`${name} · 첫 장`} />
              <Tape color="blue" w={70} h={22} style={{ left: 50, top: -8 }} />
            </div>
            <p className="t-body">{name}에서의 첫 일기를 남겨 보세요</p>
            <Button block icon={assets.iconPlusCream} onClick={() => navigate('/new/photos')}>
              {name} 일기 쓰기
            </Button>
          </div>
        )}
      </div>
      <TabBar active="shelf" />
    </div>
  );
}

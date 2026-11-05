import assets from '../assetMap.js';
import Logo from './Logo.jsx';
import { StatusBar } from './common.jsx';
import { chipDate, dowLong } from '../utils/date.js';

/** 홈(책상 · 펼친 일기장) 공통 머리띠: 앱 이름 + 오늘 날짜 칩 + 찢어진 종이 가장자리 */
export default function HomeHeader() {
  const today = new Date();
  return (
    <>
      <header className="home-head">
        <StatusBar />
        <div className="home-head__row">
          <div className="home-head__logo">
            <Logo height={56} />
          </div>
          <div className="home-head__date" aria-label="오늘 날짜">
            <span className="t-stamp">{chipDate(today)}</span>
            <span className="t-hand-small">{dowLong(today)}</span>
          </div>
        </div>
      </header>
      <img className="home-torn" src={assets.tornEdge} alt="" />
    </>
  );
}

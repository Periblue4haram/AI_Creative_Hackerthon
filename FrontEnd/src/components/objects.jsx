import assets from '../assetMap.js';
import Logo from './Logo.jsx';
import { Polaroid, Tape } from './common.jsx';

const DEFAULT_TITLE = 'Seoul Diary';

/** 책상 위 닫힌 가죽 일기장 (240×310 기준, scale 로 축소) */
export function DiaryClosed({
  scale = 1,
  title = DEFAULT_TITLE,
  count = '내 일기장 · 12편',
  lastEntry = '마지막 11.4 · 성수동',
  peekScene = 'sceneHanRiver',
  peekCaption = '한강 노을',
}) {
  return (
    <div className="diary-closed-box" style={{ width: 240 * scale, height: 310 * scale }}>
      <div className={`diary-closed ${title === DEFAULT_TITLE ? 'diary-closed--logo' : ''}`} style={{ transform: `scale(${scale})` }}>
        <div className="diary-closed__peek">
          <Polaroid src={assets[peekScene]} caption={peekCaption} rotate={10} />
        </div>
        <div className="diary-closed__edges" />
        {[20, 76, 132, 188, 244].map((top) => (
          <span key={top} className="diary-closed__edge-line" style={{ top }} />
        ))}
        <div className="diary-closed__cover" />
        <div className="diary-closed__spine" />
        <div className="diary-closed__stitch" />
        <div className="diary-closed__plate" />
        {title === DEFAULT_TITLE ? (
          <Logo className="diary-closed__title diary-closed__logo" height={58} />
        ) : (
          <p className="diary-closed__title t-hand-title" style={{ fontSize: 26 }}>
            {title}
          </p>
        )}
        <p className="diary-closed__count t-caption-strong">{count}</p>
        <p className="diary-closed__last" style={{ fontSize: 12, lineHeight: '20px' }}>
          {lastEntry}
        </p>
        <div className="diary-closed__band" />
        <img className="diary-closed__ribbon" src={assets.ribbon} alt="" />
        <Tape color="rose" w={76} h={24} rotate={-8} style={{ left: 150, top: 6 }} />
      </div>
    </div>
  );
}

/** 지하철 승차권 조각 (150×72) */
export function MetroTicket({ from = '성수', to = '안국', date = '11.06', no = '024' }) {
  return (
    <div className="ticket">
      <img className="ticket__bg" src={assets.metroTicket} alt="" />
      <span className="ticket__dash">
        <img src={assets.ticketDash} alt="" />
      </span>
      <p className="ticket__brand t-stamp">SEOUL METRO</p>
      <p className="ticket__route t-caption-strong">
        {from} → {to}
      </p>
      <p className="ticket__date">{date}</p>
      <p className="ticket__no">
        No.
        <br />
        {no}
      </p>
    </div>
  );
}

/** 두루마리 지도 (78×300 + 그림자 영역) */
export function ScrollMap() {
  return (
    <div className="scroll-map">
      <img src={assets.objScrollMap} alt="" />
    </div>
  );
}

/** 연필 (180×14) */
export function Pencil() {
  return (
    <div className="pencil">
      <img src={assets.objPencil} alt="" />
    </div>
  );
}

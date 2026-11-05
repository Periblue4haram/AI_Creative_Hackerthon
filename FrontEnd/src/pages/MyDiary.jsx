import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import assets from '../assetMap.js';
import { AppBar, Button, Polaroid, Stamp, StatusBar, TabBar, Tape, WoodDesk } from '../components/common.jsx';
import { ENTRIES, SCENES } from '../data/mock.js';
import { fullDate, stampDate } from '../utils/date.js';

/** 04 내 일기(펼친 일기장) · 04-E 빈 상태(?empty=1) */
export default function MyDiary() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const entries = params.get('empty') ? [] : ENTRIES;
  const [idx, setIdx] = useState(0);
  const entry = entries[idx];
  const total = entries.length;
  const goNew = () => navigate('/new/photos');

  return (
    <div className="screen screen--desk screen--fixed">
      <WoodDesk />
      <div className="band">
        <StatusBar />
        <AppBar title="내 일기장" right={total ? `${idx + 1} / ${total}` : undefined} onBack={() => navigate('/')} />
      </div>

      <div className="open-diary diary-view">
        <div className="open-diary__stitch" />
        <div className="open-diary__page">
          <img className="open-diary__lines" src={assets.linedPaper} alt="" />

          {entry ? (
            <>
              <button
                type="button"
                className="page-curl"
                aria-label="다음 장"
                onClick={() => setIdx((i) => Math.min(i + 1, total - 1))}
              >
                <img src={assets.pageCurl} alt="" />
              </button>
              <article className="entry" key={entry.id}>
                <div className="entry__meta">
                  <span className="t-date">{fullDate(entry.date)}</span>
                  <span className="entry__place t-caption-strong">
                    <img src={assets.iconPinSmall} alt="" />
                    {entry.district} · {entry.place}
                  </span>
                </div>
                <h2 className="t-hand-title">{entry.title}</h2>
                <div className="entry__picture">
                  <Polaroid
                    src={assets[SCENES[entry.scene]]}
                    caption={entry.caption}
                    width={230}
                    photoH={110}
                    rotate={-3}
                    style={{ position: 'absolute', left: 31, top: 4 }}
                  />
                  <Tape color="sage" w={80} h={26} rotate={2} style={{ left: 108, top: -6 }} />
                  <Stamp
                    district={entry.district}
                    date={stampDate(new Date(2026, 10, 6))}
                    size={76.8}
                    rotate={12}
                    style={{ position: 'absolute', left: 222, top: 128 }}
                  />
                </div>
                <p className="entry__body t-body">{entry.body}</p>
              </article>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state__polaroid">
                <Polaroid src={assets.sceneEmpty} caption="오늘의 첫 장" rotate={4} style={{ margin: '10px 0 0 1.26px' }} />
                <Tape color="rose" w={77} h={26} style={{ left: 50, top: -8 }} />
              </div>
              <h2 className="t-title">아직 쓴 일기가 없어요</h2>
              <p className="t-hand-note" style={{ textAlign: 'center' }}>
                오늘 찍은 사진으로
                <br />
                첫 장을 채워 볼까요?
              </p>
              <Button icon={assets.iconPlusCream} onClick={goNew}>
                새 일기 쓰기
              </Button>
            </div>
          )}
        </div>
      </div>

      {entry && (
        <div className="page-controls">
          <button
            type="button"
            className="btn btn--secondary"
            style={{ padding: '0 14px' }}
            aria-label="이전 장"
            disabled={idx === 0}
            onClick={() => setIdx((i) => Math.max(i - 1, 0))}
          >
            <img src={assets.iconChevronLeftBtn} alt="" />
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ padding: '0 14px' }}
            aria-label="다음 장"
            disabled={idx === total - 1}
            onClick={() => setIdx((i) => Math.min(i + 1, total - 1))}
          >
            <img src={assets.iconChevronRightBtn} alt="" />
          </button>
          <Button style={{ flex: 1 }} icon={assets.iconPlusCream} onClick={goNew}>
            새 일기 쓰기
          </Button>
        </div>
      )}

      <div style={{ flex: 1 }} />
      <TabBar active="desk" />
    </div>
  );
}

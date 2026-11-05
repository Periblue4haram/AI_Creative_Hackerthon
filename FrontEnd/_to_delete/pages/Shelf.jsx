import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import assets from '../assetMap.js';
import DesktopNav from '../components/DesktopNav.jsx';
import { StatusBar, TabBar, WoodDesk } from '../components/common.jsx';
import { DISTRICTS } from '../data/mock.js';
import useDesktop from '../hooks/useDesktop.js';

const PAGES = [DISTRICTS.slice(0, 9), DISTRICTS.slice(9, 18), DISTRICTS.slice(18, 25)];
const visitedCount = DISTRICTS.filter((d) => d.mine > 0).length;
const myTotal = DISTRICTS.reduce((n, d) => n + d.mine, 0);

function Book({ d, onOpen }) {
  return (
    <button type="button" className={`book ${d.mine ? 'book--mine' : ''}`} onClick={() => onOpen(d.name)}>
      <span className="book__title t-heading">{d.name}</span>
      <span className="book__sub t-caption">{d.mine ? `내 일기 ${d.mine}편` : '아직 없음'}</span>
      {d.mine > 0 && <img className="book__tape" src={assets.tapeSage} alt="" />}
    </button>
  );
}

/** 05 책장: 25개 구 책. 모바일은 3×3 세 쪽, 데스크톱은 책등을 한 줄로 꽂는다. */
export default function Shelf() {
  const navigate = useNavigate();
  const wide = useDesktop();
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState('강남구');
  const open = (name) => navigate(`/book/${name}`);

  if (wide) {
    const d = DISTRICTS.find((x) => x.name === sel);
    return (
      <div className="screen screen--cream dsk-screen">
        <PaperBg />
        <DesktopNav active="shelf" />
        <div className="shelf-d__head">
          <h1 className="t-title">책장</h1>
          <p className="t-caption">서울 25개 구 · 다녀온 곳 {visitedCount}개 구 · 내 일기 {myTotal}편</p>
        </div>
        <img className="home-torn" src={assets.tornEdge} alt="" style={{ position: 'relative' }} />
        <div className="shelf-d__wood">
          <WoodDesk />
          <div className="spines" role="list">
            {DISTRICTS.map((x, i) => (
              <button
                key={x.name}
                role="listitem"
                type="button"
                className={`spine ${x.mine ? 'spine--mine' : ''} ${sel === x.name ? 'spine--sel' : ''}`}
                style={{ height: 150 + ((i * 37) % 60) }}
                onClick={() => setSel(x.name)}
                onDoubleClick={() => open(x.name)}
              >
                <span>{x.name}</span>
              </button>
            ))}
          </div>
          <div className="spines__board" />
          {d && (
            <section className="shelf-d__card">
              <div className="book book--mine book--mini"><span className="book__title t-heading">{d.name}</span><span className="book__sub t-caption">내 일기 {d.mine}편</span></div>
              <div className="shelf-d__info">
                <h2 className="t-title">{d.name}</h2>
                <p className="t-caption">일기 {d.mine}편 · 모두의 일기 {d.all}편</p>
                <p className="t-body-strong">마지막 기록 · 10.30 선릉 산책</p>
              </div>
              <div className="shelf-d__thumbs">
                <figure><img src={assets.sceneGyeongbok} alt="" /><figcaption className="t-caption">선릉</figcaption></figure>
                <figure><img src={assets.sceneHanRiver} alt="" /><figcaption className="t-caption">10.30</figcaption></figure>
              </div>
              <button type="button" className="btn btn--primary" onClick={() => open(d.name)}>
                책 펼치기 <img src={assets.iconChevronRight} alt="" style={{ filter: 'brightness(5)' }} />
              </button>
            </section>
          )}
        </div>
      </div>
    );
  }

  const books = PAGES[page];
  return (
    <div className="screen screen--cream screen--fixed">
      <PaperBg />
      <StatusBar />
      <header className="shelf-head">
        <h1 className="t-title">책장</h1>
        <p className="t-caption">서울 25개 구 · 다녀온 곳 {visitedCount}개 구</p>
      </header>
      <img className="home-torn" src={assets.tornEdge} alt="" style={{ position: 'relative' }} />
      <div className="shelf-m">
        <WoodDesk />
        <div className="shelf-m__rows">
          {[0, 1, 2].map((r) => (
            <div className="shelf-m__row" key={r}>
              {books.slice(r * 3, r * 3 + 3).map((d) => (
                <Book key={d.name} d={d} onOpen={open} />
              ))}
              {Array.from({ length: Math.max(0, 3 - books.slice(r * 3, r * 3 + 3).length) }).map((_, k) => (
                <span key={`e${k}`} className="book book--empty" />
              ))}
            </div>
          ))}
        </div>
        <div className="pager">
          <button type="button" aria-label="이전 쪽" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <img src={assets.iconChevronLeftBtn} alt="" />
          </button>
          {PAGES.map((_, i) => (
            <i key={i} className={i === page ? 'pager__on' : ''} />
          ))}
          <button type="button" aria-label="다음 쪽" disabled={page === PAGES.length - 1} onClick={() => setPage((p) => p + 1)}>
            <img src={assets.iconChevronRightBtn} alt="" />
          </button>
        </div>
      </div>
      <TabBar active="shelf" />
    </div>
  );
}

function PaperBg() {
  return <img className="fill-img" src={assets.paperGrain} alt="" />;
}

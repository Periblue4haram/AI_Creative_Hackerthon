import { useNavigate } from 'react-router-dom';
import assets from '../assetMap.js';
import DesktopNav from '../components/DesktopNav.jsx';
import { AppBar, Button, StatusBar, Stamp, Tape, WoodDesk } from '../components/common.jsx';
import useDesktop from '../hooks/useDesktop.js';
import { stampDate } from '../utils/date.js';

const TITLE = '창가 자리의 라테';
const BODY = '혼자 성수동 골목을 걸었다. 창가 자리에서 마신 따뜻한 라테가 오늘의 가장 좋은 순간이었다. 붉은 벽돌 사이로 오후 햇살이 천천히 기울었다.';

function Actions({ onSave, onRedo, onEdit, onShare }) {
  return (
    <>
      <div className="result-actions__row">
        <Button variant="secondary" icon={assets.iconRefresh} onClick={onRedo}>다시 그리기</Button>
        <Button variant="secondary" icon={assets.iconEdit} onClick={onEdit}>글 수정</Button>
      </div>
      <div className="result-actions__row">
        <Button variant="ghost" onClick={onShare}>공유하기</Button>
        <Button icon={assets.iconCheckCream} onClick={onSave}>일기장에 저장</Button>
      </div>
    </>
  );
}

function Picture({ big }) {
  return (
    <div className={`result-pic ${big ? 'result-pic--big' : ''}`}>
      <img src={assets.sceneSeongsu} alt="창가 자리에서 라테를 마시는 그림" />
      <Tape color="sage" w={90} h={26} rotate={-3} style={{ left: '38%', top: -12 }} />
      <Stamp district="성동구" date={stampDate(new Date())} size={big ? 110 : 76} rotate={12} style={{ position: 'absolute', right: 10, bottom: -26 }} />
      <p className="result-pic__cap t-hand-small">창가 자리</p>
    </div>
  );
}

/** 10 결과: 모바일은 일기 한 장 + 버튼 4개, 데스크톱은 일기장 + 오른쪽 "마음에 드나요?" 패널 */
export default function NewResult() {
  const navigate = useNavigate();
  const wide = useDesktop();
  const act = {
    onSave: () => navigate('/diary'),
    onRedo: () => navigate('/new/style'),
    onEdit: () => window.alert('글 수정은 백엔드 연동 후 열려요.'),
    onShare: () => window.alert('공유는 백엔드 연동 후 열려요.'),
  };

  if (wide) {
    return (
      <div className="screen screen--desk dsk-screen">
        <WoodDesk />
        <DesktopNav active="desk" />
        <div className="result-d">
          <div className="open-diary result-d__book">
            <div className="open-diary__stitch" />
            <div className="open-diary__page">
              <img className="open-diary__lines" src={assets.linedPaper} alt="" />
              <article className="result-d__page">
                <div className="result-d__pic"><Picture big /></div>
                <div className="result-d__text">
                  <span className="t-date">2026.11.06 (FRI)</span>
                  <span className="entry__place t-caption-strong"><img src={assets.iconPinSmall} alt="" />성동구 · 성수동</span>
                  <h1 className="t-hand-title">{TITLE}</h1>
                  <p className="t-body" style={{ lineHeight: '30px' }}>{BODY}</p>
                  <span className="mood-tag t-hand-small">오늘의 기분 · 따뜻한</span>
                </div>
              </article>
            </div>
            <span className="bookmark" aria-hidden="true" />
          </div>
          <aside className="result-d__panel">
            <p className="t-body-strong">마음에 드나요?</p>
            <p className="t-caption">저장하면 일기장 한 편이 돼요</p>
            <div className="result-d__btns">
              <Button block icon={assets.iconCheckCream} onClick={act.onSave}>일기장에 저장</Button>
              <Button block variant="secondary" icon={assets.iconRefresh} onClick={act.onRedo}>다시 그리기</Button>
              <Button block variant="secondary" icon={assets.iconEdit} onClick={act.onEdit}>글 수정</Button>
              <Button block variant="ghost" onClick={act.onShare}>공유하기</Button>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen--desk screen--fixed">
      <WoodDesk />
      <div className="band">
        <StatusBar />
        <AppBar title="오늘의 그림일기" icon="close" onBack={() => navigate('/today')} />
      </div>
      <div className="open-diary gen-diary gen-diary--result">
        <div className="open-diary__stitch" />
        <div className="open-diary__page">
          <img className="open-diary__lines" src={assets.linedPaper} alt="" />
          <article className="entry" style={{ left: 22 }}>
            <div className="entry__meta">
              <span className="t-date">2026.11.06 (FRI)</span>
              <span className="entry__place t-caption-strong"><img src={assets.iconPinSmall} alt="" />성동구 · 성수동</span>
            </div>
            <h2 className="t-hand-title">{TITLE}</h2>
            <Picture />
            <p className="entry__body t-body" style={{ marginTop: 18 }}>{BODY}</p>
          </article>
        </div>
      </div>
      <div className="result-actions">
        <Actions {...act} />
      </div>
    </div>
  );
}

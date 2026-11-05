import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import assets from '../assetMap.js';
import { AppBar, Button, PaperGrain, StatusBar, Tape } from '../components/common.jsx';

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="checkbox">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={`checkbox__box ${checked ? 'checkbox__box--on' : ''}`}>
        {checked && <img src={assets.iconCheckCream} alt="" />}
      </span>
      <span className="t-label">{label}</span>
    </label>
  );
}

/** 01-2 위치 정보 · 얼굴 처리 동의. 필수 항목을 모두 체크해야 시작할 수 있다. */
export default function Consent() {
  const navigate = useNavigate();
  const [geo, setGeo] = useState(false);
  const [face, setFace] = useState(false);
  const ready = geo && face;

  const start = () => {
    try {
      localStorage.setItem('seoul-diary:onboarded', '1');
    } catch {
      /* 저장소를 못 쓰는 환경에서는 그냥 진행 */
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="screen screen--cream screen--fixed">
      <PaperGrain />
      <StatusBar />
      <AppBar title="시작하기 전에" />

      <div className="consent">
        <h1 className="t-title">
          그림일기를 만들려면
          <br />
          두 가지 동의가 필요해요
        </h1>

        <section className="consent-card">
          <div className="consent-card__head">
            <span className="consent-card__icon">
              <img src={assets.iconPin} alt="" />
            </span>
            <h2 className="t-heading">사진 위치 정보 활용</h2>
          </div>
          <p className="t-body">사진에 저장된 위치로 어느 자치구, 어느 동네에서 찍었는지 찾아요.</p>
          <Checkbox checked={geo} onChange={setGeo} label="동의합니다 (필수)" />
          <Tape color="sage" w={70} h={22} rotate={-6} style={{ left: 240, top: -17 }} />
        </section>

        <section className="consent-card">
          <div className="consent-card__head">
            <span className="consent-card__icon">
              <img src={assets.iconFace} alt="" />
            </span>
            <h2 className="t-heading">얼굴 처리 동의</h2>
          </div>
          <p className="t-body">
            주인공의 얼굴은 그림 캐릭터로 그리고, 함께 찍힌 다른 사람의 얼굴은 제외하거나 캐릭터로 익명화해요.
          </p>
          <Checkbox checked={face} onChange={setFace} label="동의합니다 (필수)" />
          <Tape color="rose" w={70} h={22} rotate={5} style={{ left: 238, top: -10 }} />
        </section>

        <button type="button" className="privacy-link t-caption-strong" onClick={() => navigate('/soon')}>
          <span style={{ textDecoration: 'underline' }}>개인정보 처리 방침 자세히 보기</span>
          <img src={assets.iconChevronRight} alt="" />
        </button>
      </div>

      <div className="consent-footer">
        <Button block disabled={!ready} onClick={start}>
          동의하고 시작하기
        </Button>
        <p className="t-caption" style={{ textAlign: 'center' }}>
          필수 항목을 모두 체크하면 버튼이 활성화돼요
        </p>
      </div>
    </div>
  );
}

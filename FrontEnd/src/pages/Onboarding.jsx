import { Link, useNavigate } from 'react-router-dom';
import assets from '../assetMap.js';
import { Button, PaperGrain, Polaroid, Stamp, StatusBar, Tape } from '../components/common.jsx';
import { DiaryClosed, MetroTicket } from '../components/objects.jsx';

/** 01-1 서비스 소개 */
export default function Onboarding() {
  const navigate = useNavigate();
  return (
    <div className="screen screen--cream screen--fixed">
      <PaperGrain />
      <StatusBar />

      <div className="hero" aria-hidden="true">
        <img className="hero__circle" src={assets.woodCircle} alt="" />
        <div className="hero__item" style={{ left: 18, top: 42.65, width: 183.2, height: 186.6 }}>
          <Polaroid src={assets.sceneGyeongbok} caption="경복궁 돌담길" scale={1.05} rotate={-10} />
        </div>
        <div className="hero__item" style={{ left: 93.62, top: 60, width: 221.9, height: 277.1 }}>
          <div style={{ transform: 'rotate(4deg)' }}>
            <DiaryClosed scale={0.85} />
          </div>
        </div>
        <div className="hero__item" style={{ left: 204.57, top: 200, width: 170, height: 173.4 }}>
          <Polaroid src={assets.sceneHanRiver} caption="한강 노을" rotate={8} />
        </div>
        <Tape color="blue" w={72} h={20} rotate={25} style={{ left: 243, top: 208 }} />
        <div className="hero__item" style={{ left: 0.78, top: 290, width: 116.4, height: 116.4 }}>
          <Stamp district="종로구" size={108} rotate={-12} />
        </div>
        <div className="hero__item" style={{ left: 228, top: -10.29, width: 163, height: 106.15 }}>
          <div style={{ transform: 'rotate(-12deg)' }}>
            <MetroTicket />
          </div>
        </div>
      </div>

      <div className="onb-content">
        <h1 className="onb-title">
          오늘의 사진이
          <br />
          나만의 서울 이야기가 돼요
        </h1>
        <p className="t-body">사진을 올리고 짧게 대화하면, 동네 이야기가 담긴 그림일기를 그려 드려요.</p>
        <div className="page-dots" role="img" aria-label="1 / 3 페이지">
          <span className="page-dots__on" />
          <span className="page-dots__off" />
          <span className="page-dots__off" />
        </div>
      </div>

      <div className="onb-actions">
        <Button block onClick={() => navigate('/consent')}>
          다음
        </Button>
        <p className="login-link t-caption">
          <span>이미 계정이 있나요?</span>
          <Link to="/" className="t-caption-strong" style={{ textDecoration: 'underline' }}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

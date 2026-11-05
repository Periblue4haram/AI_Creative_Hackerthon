import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import assets from '../assetMap.js';
import { StatusBar, WoodDesk } from '../components/common.jsx';
import { DiaryClosed } from '../components/objects.jsx';
import { DISTRICTS } from '../data/mock.js';

// 11-1 책이 가까워짐 → 11-2 암전 → 11-3 책이 펼쳐짐 → 구 책 페이지
const PHASES = [
  { id: 'near', ms: 1400 },
  { id: 'dark', ms: 1300 },
  { id: 'open', ms: 1400 },
];

/** 11 자치구 책 펼치기: 3단계 암전 전환 후 그 동네 책으로 들어간다. */
export default function BookOpen() {
  const { district = '성동구' } = useParams();
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const d = DISTRICTS.find((x) => x.name === district);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (i + 1 < PHASES.length) setI(i + 1);
      else navigate(`/shelf/${district}`, { replace: true });
    }, PHASES[i].ms);
    return () => window.clearTimeout(t);
  }, [i, district, navigate]);

  const phase = PHASES[i].id;
  return (
    <div className={`screen book-open book-open--${phase}`} onClick={() => navigate(`/shelf/${district}`, { replace: true })}>
      {phase === 'near' && (
        <>
          <WoodDesk />
          <StatusBar />
          <div className="book-near">
            <DiaryClosed scale={1.25} title={district} count={`내 일기 ${d?.mine ?? 0}편`} lastEntry={`모두의 일기 ${d?.all ?? 0}편`} />
          </div>
        </>
      )}
      {phase === 'dark' && (
        <div className="book-dark">
          <p className="t-heading">{district}</p>
          <span className="book-dots"><i /><i /><i /></span>
        </div>
      )}
      {phase === 'open' && (
        <div className="book-dark">
          <div className="book-spread" aria-hidden="true">
            <span />
            <span />
          </div>
          <p className="t-body">{district} 책이 펼쳐져요</p>
        </div>
      )}
      <span className="sr-only">화면을 누르면 건너뛸 수 있어요</span>
    </div>
  );
}

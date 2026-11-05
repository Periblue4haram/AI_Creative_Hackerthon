import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NoticeSheet from '../components/NoticeSheet.jsx';
import assets from '../assetMap.js';
import { Polaroid, StatusBar, Tape, WoodDesk } from '../components/common.jsx';

const STEPS = ['사진과 장소 살펴보기', '그림 그리는 중', '일기 글 쓰기', '일기장에 붙이기'];
const SECONDS = 30;

/** 09 생성 중: 단계 체크리스트와 남은 시간을 보여 주고, 끝나면 결과로 넘어간다. (목업: 약 6초) */
export default function NewGenerating() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  // 예외 상태 미리보기: /new/generating?e=8 (그림일기를 만들지 못했어요)
  const [params] = useSearchParams();
  const failed = params.get('e') === '8';

  useEffect(() => {
    if (failed) return undefined;
    if (step >= STEPS.length) {
      const t = window.setTimeout(() => navigate('/new/result', { replace: true }), 500);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setStep((s) => s + 1), 1500);
    return () => window.clearTimeout(t);
  }, [step, navigate, failed]);

  const left = Math.max(Math.round(SECONDS * (1 - step / STEPS.length)), 0);

  return (
    <div className="screen screen--desk screen--fixed">
      <WoodDesk />
      <div className="band">
        <StatusBar />
      </div>

      <div className="open-diary gen-diary">
        <div className="open-diary__stitch" />
        <div className="open-diary__page">
          <img className="open-diary__lines" src={assets.linedPaper} alt="" />
          <div className="gen-diary__body">
            <span className="t-date">2026.11.06 (FRI)</span>
            <div className="gen-diary__pic">
              <Polaroid src={assets.sceneSeongsu} scale={0.7} rotate={-3} style={{ position: 'absolute', left: 10, top: 0 }} />
              <Tape color="rose" w={72} h={22} rotate={-6} style={{ left: 60, top: -8 }} />
              <div className="gen-diary__sketch" aria-hidden="true" />
            </div>
            <span className="skeleton" style={{ width: '88%' }} />
            <span className="skeleton" style={{ width: '70%' }} />
            <span className="skeleton" style={{ width: '54%' }} />
          </div>
        </div>
      </div>

      <section className="gen-card" aria-live="polite">
        <h2 className="t-heading">그림일기를 그리고 있어요</h2>
        <ul className="gen-steps">
          {STEPS.map((label, i) => {
            const state = i < step ? 'done' : i === step ? 'now' : 'todo';
            return (
              <li key={label} className={`gen-step gen-step--${state}`}>
                <span className="gen-step__dot">{state === 'done' && <img src={assets.iconCheckCream} alt="완료" />}</span>
                {label}
              </li>
            );
          })}
        </ul>
        <p className="t-body-strong">약 {left}초 남았어요</p>
      </section>
      {failed && (
        <NoticeSheet
          icon="alert"
          tape="rose"
          title="그림일기를 만들지 못했어요"
          body="잠시 후 다시 시도하거나 설정을 바꿔 보세요."
          actions={[
            { label: '다시 시도', onClick: () => navigate('/new/generating', { replace: true }) },
            { label: '설정으로', ghost: true, onClick: () => navigate('/new/style') },
          ]}
          onClose={() => navigate('/new/style')}
        />
      )}
    </div>
  );
}

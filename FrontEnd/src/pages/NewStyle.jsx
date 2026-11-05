import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import assets from '../assetMap.js';
import { AppBar, Button, Chip, PaperGrain, Progress, StatusBar } from '../components/common.jsx';

const STYLES = [
  { id: 'same', label: '성수동 그대로', scene: 'sceneSeongsu', rec: true },
  { id: 'water', label: '수채화', scene: 'sceneHanRiver' },
  { id: 'pen', label: '펜 드로잉', scene: 'sceneGyeongbok' },
  { id: 'retro', label: '레트로 만화', scene: 'sceneSeongsu', filter: 'hue-rotate(-18deg) saturate(1.35)' },
];
const MOODS = ['따뜻한 · 추천', '차분한', '설레는', '몽환적인'];

/** 08 그림일기 설정 (4/4): 그림 스타일 · 분위기 · 일기 언어 */
export default function NewStyle() {
  const navigate = useNavigate();
  const [style, setStyle] = useState('same');
  const [mood, setMood] = useState(MOODS[0]);
  const [lang, setLang] = useState('device');

  return (
    <div className="screen screen--cream">
      <PaperGrain />
      <StatusBar />
      <AppBar title="새 일기" right="4 / 4" />
      <Progress step={4} />

      <div className="flow-scroll">
        <h2 className="t-title">어떤 그림으로 남길까요?</h2>

        <section className="set-block" aria-label="그림 스타일">
          <p className="t-label">그림 스타일</p>
          <div className="style-grid">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`style-card ${style === s.id ? 'style-card--on' : ''}`}
                aria-pressed={style === s.id}
                onClick={() => setStyle(s.id)}
              >
                <span className="style-card__img">
                  <img src={assets[s.scene]} alt="" style={s.filter ? { filter: s.filter } : undefined} />
                  {style === s.id && (
                    <span className="style-card__check">
                      <img src={assets.iconCheckCream} alt="선택됨" />
                    </span>
                  )}
                </span>
                <span className="style-card__label t-caption-strong">
                  {s.label}
                  {s.rec && <em className="style-card__rec">추천</em>}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="set-block" aria-label="분위기">
          <p className="t-label">분위기</p>
          <div className="chip-row">
            {MOODS.map((m) => (
              <Chip key={m} on={mood === m} onClick={() => setMood(m)}>
                {m}
              </Chip>
            ))}
          </div>
        </section>

        <section className="set-row">
          <label className="t-label" htmlFor="diary-lang">
            일기 언어
          </label>
          <select id="diary-lang" className="select" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="device">English (기기 언어)</option>
            <option value="ko">한국어</option>
            <option value="ja">日本語</option>
          </select>
        </section>
      </div>

      <div className="flow-footer">
        <Button block icon={assets.iconSparkle} onClick={() => navigate('/new/generating')}>
          그림일기 만들기
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NoticeSheet from '../components/NoticeSheet.jsx';
import assets from '../assetMap.js';
import { AppBar, Button, Chip, PaperGrain, Progress, StatusBar, Tape } from '../components/common.jsx';

/** 06 사진 확인: 위치(구 · 동네) 확인/수정, 사진 속 얼굴 처리 선택 */
export default function NewConfirm() {
  const navigate = useNavigate();
  // 예외 상태 미리보기: /new/confirm?e=1 (위치 없음) · 2 (서울 밖) · 3 (얼굴 없음) · 4 (다른 사람)
  const [params] = useSearchParams();
  const [sheet, setSheet] = useState(params.get('e'));
  const closeSheet = () => setSheet(null);
  const focusSearch = () => {
    closeSheet();
    window.setTimeout(() => document.getElementById('place-search')?.focus(), 0);
  };
  const [place, setPlace] = useState('성동구 · 성수동');
  const [query, setQuery] = useState('');
  const [faceB, setFaceB] = useState('character'); // 'exclude' | 'character'

  const applyQuery = () => {
    const q = query.trim();
    if (!q) return;
    setPlace(q);
    setQuery('');
  };

  return (
    <div className="screen screen--cream">
      <PaperGrain />
      <StatusBar />
      <AppBar title="새 일기" right="2 / 4" />
      <Progress step={2} />

      <div className="flow-scroll flow-scroll--tight">
        <h2 className="t-title">여기서 찍은 사진이 맞나요?</h2>

        <section className="loc-card" aria-label="사진 위치">
          <img className="loc-card__map" src={assets.miniMap} alt="" />
          <div className="loc-card__text">
            <p className="t-heading">{place}</p>
            <p className="t-caption">사진 4장의 위치로 찾았어요</p>
          </div>
          <Button variant="ghost" small onClick={() => document.getElementById('place-search')?.focus()}>
            수정
          </Button>
          <Tape color="sage" w={60} h={20} rotate={24} style={{ left: -17, top: 3 }} />
        </section>

        <div className="manual-select">
          <label className="search-field">
            <img src={assets.iconSearch} alt="" />
            <input
              id="place-search"
              type="text"
              placeholder="동네 이름 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyQuery()}
            />
          </label>
          <Button variant="secondary" small icon={assets.iconMap} onClick={() => navigate('/soon')}>
            지도에서
          </Button>
        </div>

        <img className="divider-img" src={assets.divider} alt="" />

        <div>
          <h3 className="t-heading">주인공을 골라 주세요</h3>
          <p className="t-caption">사진 2 · 얼굴 2명 감지</p>
        </div>

        <div className="faces">
          <div className="faces__photo">
            <img src={assets.sceneHanRiver} alt="얼굴이 감지된 사진" />
            <img className="faces__a" src={assets.faceA} alt="" />
            <img className="faces__b" src={assets.faceB} alt="" width="30" height="30" />
          </div>
          <div className="faces__list">
            <div className="face">
              <div className="face__who">
                <span className="face__badge face__badge--on t-stamp">A</span>
                <span className="t-label">주인공 (나)</span>
              </div>
              <div className="face__opts">
                <Chip on tight>
                  ✓ 주인공
                </Chip>
              </div>
            </div>
            <div className="face">
              <div className="face__who">
                <span className="face__badge t-stamp">B</span>
                <span className="t-label">다른 사람</span>
              </div>
              <div className="face__opts">
                <Chip tight on={faceB === 'exclude'} onClick={() => setFaceB('exclude')}>
                  제외
                </Chip>
                <Chip tight on={faceB === 'character'} onClick={() => setFaceB('character')}>
                  캐릭터로
                </Chip>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flow-footer">
        <Button block onClick={() => navigate('/new/chat')}>
          다음
        </Button>
      </div>

      {sheet === '1' && (
        <NoticeSheet
          icon="pin"
          title="위치 정보가 없어요"
          body="사진에 위치 정보가 없어요. 지도나 검색으로 동네를 골라 주세요."
          actions={[
            { label: '지도에서 고르기', onClick: () => navigate('/map') },
            { label: '검색', ghost: true, onClick: focusSearch },
          ]}
          onClose={closeSheet}
        />
      )}
      {sheet === '2' && (
        <NoticeSheet
          icon="pin"
          tape="rose"
          title="서울 밖에서 찍은 사진이에요"
          body="이 앱은 서울 25개 구의 일기를 모아요. 다른 사진을 고르거나 동네를 직접 골라 주세요."
          actions={[
            { label: '다른 사진', onClick: () => navigate('/new/photos') },
            { label: '동네 고르기', ghost: true, onClick: focusSearch },
          ]}
          onClose={closeSheet}
        />
      )}
      {sheet === '3' && (
        <NoticeSheet
          icon="face"
          title="얼굴이 보이지 않아요"
          body="배경 중심의 그림일기로 그릴게요."
          actions={[{ label: '계속하기', onClick: closeSheet }]}
          onClose={closeSheet}
        />
      )}
      {sheet === '4' && (
        <NoticeSheet
          icon="user"
          tape="blue"
          title="다른 사람이 함께 찍혔어요"
          body="그 얼굴은 빼거나 캐릭터로 바꿔서 그릴 수 있어요."
          actions={[
            { label: '캐릭터로', onClick: () => { setFaceB('character'); closeSheet(); } },
            { label: '제외', ghost: true, onClick: () => { setFaceB('exclude'); closeSheet(); } },
          ]}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}

import { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NoticeSheet from '../components/NoticeSheet.jsx';
import assets from '../assetMap.js';
import { AppBar, Button, PaperGrain, Progress, StatusBar } from '../components/common.jsx';
import { DEMO_PHOTOS, MAX_PHOTOS, SCENES } from '../data/mock.js';
import { clock } from '../utils/date.js';

const ROTATIONS = [0, -2, 2, -3, 1, -1];
const MAX_BYTES = 20 * 1024 * 1024;

/** 05 사진 업로드: 사진 선택 · 순서 확인 · 실패한 사진 다시 시도 */
export default function NewPhotos() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [photos, setPhotos] = useState(DEMO_PHOTOS);
  const [dragId, setDragId] = useState(null);
  const [notice, setNotice] = useState('');
  // 예외 상태 미리보기: /new/photos?e=5 (올릴 수 없는 사진) · 6 (일부 업로드 실패)
  const [params] = useSearchParams();
  const [sheet, setSheet] = useState(params.get('e'));

  const failedCount = photos.filter((p) => p.failed).length;
  const readyCount = photos.length - failedCount;

  const addFiles = (fileList) => {
    const files = Array.from(fileList ?? []);
    const room = MAX_PHOTOS - photos.length;
    const okType = (f) => /^image\/(jpeg|png|heic|heif)$/i.test(f.type) || /\.(jpe?g|png|heic|heif)$/i.test(f.name);
    const valid = files.filter((f) => okType(f) && f.size <= MAX_BYTES);
    if (files.length > 0 && valid.length < files.length) setSheet('5');
    const accepted = valid.slice(0, Math.max(room, 0));
    const skipped = valid.length - accepted.length;
    setNotice(skipped > 0 ? `사진은 최대 ${MAX_PHOTOS}장, 장당 20MB까지 올릴 수 있어요.` : '');
    if (!accepted.length) return;
    setPhotos((prev) => [
      ...prev,
      ...accepted.map((f, i) => ({
        id: `f${Date.now()}${i}`,
        url: URL.createObjectURL(f),
        time: clock(new Date(f.lastModified)),
        rotate: ROTATIONS[(prev.length + i) % ROTATIONS.length],
      })),
    ]);
  };

  const retryFailed = () =>
    setPhotos((prev) => prev.map((p) => (p.failed ? { ...p, failed: false, time: '12:30' } : p)));

  const reorder = (overId) => {
    if (!dragId || dragId === overId) return;
    setPhotos((prev) => {
      const from = prev.findIndex((p) => p.id === dragId);
      const to = prev.findIndex((p) => p.id === overId);
      const next = [...prev];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  };

  return (
    <div className="screen screen--cream">
      <PaperGrain />
      <StatusBar />
      <AppBar title="새 일기" icon="close" right={`1 / 4`} onBack={() => navigate('/')} />
      <Progress step={1} />

      <div className="flow-scroll">
        <h2 className="t-title">오늘의 사진을 골라 주세요</h2>
        <p className="t-caption">
          1~{MAX_PHOTOS}장 · JPG, PNG, HEIC · 장당 20MB 이하
        </p>

        <button
          type="button"
          className="add-photos"
          onClick={() => inputRef.current?.click()}
          disabled={photos.length >= MAX_PHOTOS}
        >
          <span className="add-photos__cam">
            <img src={assets.iconPlusInk} alt="" />
          </span>
          <span className="add-photos__text">
            <span className="t-body-strong">사진 선택</span>
            <span className="t-caption">앨범에서 오늘 찍은 사진을 골라요</span>
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {notice && (
          <p className="t-caption" role="status" style={{ color: 'var(--danger)' }}>
            {notice}
          </p>
        )}

        <div className="list-head">
          <span className="t-body-strong">선택한 사진 {photos.length}장</span>
          <span className="sort-chip t-caption-strong">촬영 시간순</span>
        </div>

        <ul className="photo-grid">
          {photos.map((p, i) => (
            <li
              key={p.id}
              className="thumb-wrap"
              draggable
              onDragStart={() => setDragId(p.id)}
              onDragOver={(e) => {
                e.preventDefault();
                reorder(p.id);
              }}
              onDragEnd={() => setDragId(null)}
            >
              <div className="thumb" style={{ transform: `rotate(${p.rotate ?? 0}deg)` }}>
                <img className="thumb__photo" src={p.url ?? assets[SCENES[p.scene]]} alt={`사진 ${i + 1}`} />
                <span className="thumb__order t-stamp">{i + 1}</span>
                {p.failed ? (
                  <>
                    <span className="thumb__dim" />
                    <img className="thumb__alert" src={assets.iconAlert} alt="" />
                    <span className="thumb__fail t-caption-strong">업로드 실패</span>
                  </>
                ) : (
                  <span className="thumb__time t-date">{p.time}</span>
                )}
              </div>
            </li>
          ))}
          {failedCount > 0 && (
            <li className="thumb-retry">
              <Button variant="ghost" small icon={assets.iconRefresh} onClick={retryFailed}>
                다시 시도
              </Button>
            </li>
          )}
        </ul>

        <p className="reorder-tip t-hand-note">
          <img src={assets.iconGrip} alt="" />
          길게 눌러 끌면 순서를 바꿀 수 있어요
        </p>
      </div>

      <div className="flow-footer">
        <Button block disabled={readyCount < 1} onClick={() => navigate('/new/confirm')}>
          다음
        </Button>
      </div>

      {sheet === '5' && (
        <NoticeSheet
          icon="alert"
          tape="rose"
          title="올릴 수 없는 사진이에요"
          body="JPG·PNG·HEIC, 20MB 이하 사진만 올릴 수 있어요."
          actions={[{ label: '다른 사진 고르기', onClick: () => { setSheet(null); inputRef.current?.click(); } }]}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === '6' && (
        <NoticeSheet
          icon="refresh"
          title={`사진 ${Math.max(failedCount, 1)}장을 올리지 못했어요`}
          body="실패한 사진만 다시 올릴게요."
          actions={[{ label: '다시 시도', onClick: () => { retryFailed(); setSheet(null); } }]}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

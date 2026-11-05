import { AppBar, PaperGrain, StatusBar, TabBar } from '../components/common.jsx';

/** 아직 Figma 디자인이 없는 화면(책장, 마이페이지, 지도 팝업 등)의 자리표시자 */
export default function ComingSoon() {
  return (
    <div className="screen screen--cream">
      <PaperGrain />
      <StatusBar />
      <AppBar title="준비 중이에요" />
      <div className="soon">
        <p className="t-hand-note">이 화면은 아직 디자인 중이에요.</p>
      </div>
      <TabBar active="" />
    </div>
  );
}

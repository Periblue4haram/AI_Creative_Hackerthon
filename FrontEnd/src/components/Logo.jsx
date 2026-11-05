import logo from '../images/logo-seoul-mate.png';

/** SEOUL MATE 로고 (검정 잉크, 배경 투명). height 로 크기를 정한다. */
export default function Logo({ height = 40, className = '', style }) {
  return <img className={`logo ${className}`} src={logo} alt="SEOUL MATE" style={{ height, width: 'auto', ...style }} />;
}

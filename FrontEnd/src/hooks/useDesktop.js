import { useEffect, useState } from 'react';

const QUERY = '(min-width: 1024px)';

/** 데스크톱(1024px 이상) 여부. Figma 데스크톱 프레임은 1440px 폭 기준. */
export default function useDesktop() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

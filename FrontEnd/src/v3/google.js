// Google 로그인: Google Identity Services 로 ID 토큰을 받아 서버(/auth/google)에 넘긴다.
// 클라이언트 ID 는 백엔드 GOOGLE_CLIENT_ID 와 같은 웹 클라이언트 ID 여야 한다 (공개 값이라 코드에 둬도 된다).
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '893982560309-7r1aqqfp6f8nf7rct4l05gmo48g139u9.apps.googleusercontent.com';
const SRC = 'https://accounts.google.com/gsi/client';

let loading = null;
function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => {
        loading = null;
        reject(new Error('gsi'));
      };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** 구글 계정 선택 창을 띄워 ID 토큰을 받는다. 닫으면 'cancel', 차단·실패하면 null. */
export async function getGoogleIdToken() {
  try {
    await loadGsi();
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (r) => finish(r?.credential || null),
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    });
    window.google.accounts.id.prompt((n) => {
      // 사용자가 창을 닫은 경우는 'cancel' (오류 카드를 띄우지 않는다). 자격 증명을 받은 뒤 닫히는 경우는 callback 이 먼저 처리한다.
      if (n.isSkippedMoment?.() || n.isDismissedMoment?.()) setTimeout(() => finish('cancel'), 300);
      // 브라우저가 창을 막았거나 구글 설정 문제로 아예 못 띄운 경우
      else if (n.isNotDisplayed?.()) finish(null);
    });
  });
}

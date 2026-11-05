import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import assets from '../../assetMap.js';
import Logo from '../../components/Logo.jsx';
import { Button, Polaroid, StatusBar } from '../../components/common.jsx';
import useDesktop from '../../hooks/useDesktop.js';
import { POLICY } from '../data.js';
import { useApp } from '../store.jsx';
import { AuthShell, ErrorCard, Field, Input, Page, usePreview } from '../ui.jsx';

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
);
const GoogleBtn = ({ onClick, children = 'Google로 계속하기' }) => (
  <button type="button" className="btn btn--ghost btn--block v3-google" onClick={onClick}>
    <b>G</b> {children}
  </button>
);

/** 모바일·데스크톱 공통 인증 화면 틀: 데스크톱은 펼친 일기장, 모바일은 앱바가 있는 크림색 화면 */
function AuthPage({ title, back = 'back', onBack, children, foot, wideRight, overlay }) {
  const desk = useDesktop();
  if (desk) {
    return (
      <AuthShell wide={wideRight}>
        {title && <h1 className="t-heading auth-book__title">{title}</h1>}
        {children}
        {foot}
        {overlay}
      </AuthShell>
    );
  }
  return (
    <Page title={title ?? ''} back={back} onBack={onBack} foot={foot} overlay={overlay}>
      {children}
    </Page>
  );
}

/* ─────────── A1 시작 ─────────── */
export function Start() {
  const nav = useNavigate();
  const { auth } = useApp();
  const desk = useDesktop();
  const s = usePreview();
  const google = () => {
    if (s === 'google') return;
    auth.google();
    nav('/');
  };
  const body = (
    <>
      <h1 className="v3-hero">오늘의 사진이<br />나만의 서울 이야기가 돼요</h1>
      <p className="v3-sub">사진을 올리고 이야기를 나누면<br />그림일기 한 장이 완성돼요.</p>
      <div className="v3-stack">
        <Button block icon={null} onClick={() => nav('/signup')}><MailIcon /> 이메일로 가입하기</Button>
        <GoogleBtn onClick={google} />
      </div>
      <p className="v3-center t-body">이미 계정이 있나요? <Link className="v3-link" to="/login">로그인</Link></p>
      <p className="v3-center t-caption v3-muted">계속하면 <Link className="v3-link" to="/privacy">개인정보처리방침</Link>에 동의하게 돼요</p>
      {s === 'google' && <ErrorCard code="INVALID_GOOGLE_TOKEN" onClose={() => nav('/start')} onAction={[() => nav('/start'), () => nav('/login')]} />}
    </>
  );
  if (desk) return <AuthShell>{body}</AuthShell>;
  return (
    <div className="screen screen--cream v3 v3-start">
      <StatusBar />
      <div className="v3-start__top">
        <Logo height={56} />
        <div className="v3-start__art" aria-hidden="true">
          <i />
          <Polaroid src={assets.sceneSeongsu} caption="" scale={0.78} rotate={-7} style={{ position: 'absolute', left: 12, top: 28 }} />
          <Polaroid src={assets.sceneGyeongbok} caption="" scale={0.78} rotate={5} style={{ position: 'absolute', left: 112, top: 76 }} />
        </div>
      </div>
      <div className="v3-body v3-start__body">{body}</div>
    </div>
  );
}

/* ─────────── A2 회원가입 ─────────── */
export function Signup() {
  const nav = useNavigate();
  const { auth } = useApp();
  const s = usePreview();
  const [f, setF] = useState({ email: s === 'dup' ? 'user@example.com' : '', pw: '', nick: '', agree: s === 'dup' });
  const [err, setErr] = useState(s === 'dup' ? { email: '이미 가입한 이메일이에요. 로그인해 주세요.' } : {});
  const [card, setCard] = useState(s === 'sendfail' ? 'EMAIL_SEND_FAILED' : null);
  const set = (k) => (e) => setF({ ...f, [k]: k === 'agree' ? e.target.checked : e.target.value });

  const submit = (e) => {
    e?.preventDefault();
    const er = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) er.email = '이메일 형식을 확인해 주세요.';
    if (f.pw.length < 8) er.pw = '비밀번호는 8자 이상이에요.';
    if (f.nick.trim().length < 2 || f.nick.trim().length > 30) er.nick = '닉네임은 2~30자로 적어 주세요.';
    if (!f.agree) er.agree = '개인정보처리방침에 동의해 주세요.';
    setErr(er);
    if (Object.keys(er).length) return;
    const r = auth.signup(f.email.trim(), f.pw, f.nick.trim());
    if (!r.ok) return setErr({ email: '이미 가입한 이메일이에요. 로그인해 주세요.' });
    nav('/verify');
  };

  return (
    <AuthPage
      title="회원가입"
      onBack={() => nav('/start')}
      overlay={card && <ErrorCard code={card} onClose={() => setCard(null)} onAction={[() => nav('/verify')]} />}
    >
      <form className="v3-form" onSubmit={submit} noValidate>
        <Field label="이메일" error={err.email}>
          {(id, bad) => <Input id={id} type="email" placeholder="user@example.com" autoComplete="email" invalid={bad} value={f.email} onChange={set('email')} />}
        </Field>
        <Field label="비밀번호" error={err.pw} hint="8자 이상">
          {(id, bad) => <Input id={id} type="password" placeholder="••••••••••" autoComplete="new-password" invalid={bad} value={f.pw} onChange={set('pw')} />}
        </Field>
        <Field label="닉네임" error={err.nick} hint="2~30자 · 다른 사람과 같아도 괜찮아요">
          {(id, bad) => <Input id={id} placeholder="서울산책러" maxLength={30} invalid={bad} value={f.nick} onChange={set('nick')} />}
        </Field>
        <div className="v3-check">
          <label>
            <input type="checkbox" checked={f.agree} onChange={set('agree')} />
            <span>개인정보처리방침에 동의해요 (필수)</span>
          </label>
          <Link className="v3-link t-caption" to="/privacy">내용 보기</Link>
          {err.agree && <p className="v3-error" role="alert">{err.agree}</p>}
        </div>
        <div className="v3-or"><span>또는</span></div>
        <GoogleBtn onClick={() => { auth.google(); nav('/'); }} />
        <p className="v3-center t-caption v3-muted">가입하면 메일로 6자리 인증 코드를 보내요</p>
        <Button block type="submit" onClick={submit}>가입하기</Button>
      </form>
    </AuthPage>
  );
}

/* ─────────── A3 이메일 인증 ─────────── */
const mmss = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export function Verify() {
  const nav = useNavigate();
  const { auth } = useApp();
  const s = usePreview();
  const [digits, setDigits] = useState(s === 'wrong' ? ['1', '2', '3', '4', '5', ''] : ['', '', '', '', '', '']);
  const [bad, setBad] = useState(s === 'wrong');
  const [left, setLeft] = useState(600);
  const [wait, setWait] = useState(s ? 48 : auth.secondsToResend());
  const [card, setCard] = useState(null);
  const refs = useRef([]);
  const email = auth.pending || (s ? 'user@example.com' : null);

  useEffect(() => {
    const t = setInterval(() => {
      setLeft((x) => Math.max(0, x - 1));
      setWait((x) => Math.max(0, x - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  if (!email) return <Navigate to="/signup" replace />;

  const put = (i, v) => {
    const c = v.replace(/\D/g, '');
    if (c.length > 1) {
      const next = c.slice(0, 6).split('');
      setDigits([...next, ...Array(6 - next.length).fill('')]);
      refs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    const d = [...digits];
    d[i] = c;
    setDigits(d);
    setBad(false);
    if (c && i < 5) refs.current[i + 1]?.focus();
  };
  const full = digits.every(Boolean);
  const submit = () => {
    if (auth.verify(digits.join(''))) nav('/');
    else setBad(true);
  };
  const resend = () => {
    if (wait > 0) return setCard('TOO_MANY_REQUESTS');
    const r = auth.resend();
    if (r.ok) setWait(60);
    else setCard('TOO_MANY_REQUESTS');
  };

  return (
    <AuthPage
      title="이메일 인증"
      onBack={() => nav('/signup')}
      overlay={card && <ErrorCard code={card} onClose={() => setCard(null)} />}
      foot={<Button block disabled={!full} onClick={submit}>인증하고 시작하기</Button>}
    >
      <h2 className="v3-h2">메일로 받은 코드를<br />입력해 주세요</h2>
      <p className="v3-sub v3-sub--left">{email}으로 6자리 코드를 보냈어요.</p>
      <div className="v3-otp" role="group" aria-label="인증 코드 6자리">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            className={`v3-otp__box ${bad ? 'v3-otp__box--bad' : ''}`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={d}
            aria-label={`${i + 1}번째 숫자`}
            onChange={(e) => put(i, e.target.value)}
            onKeyDown={(e) => e.key === 'Backspace' && !digits[i] && i > 0 && refs.current[i - 1]?.focus()}
          />
        ))}
      </div>
      {bad ? (
        <p className="v3-error" role="alert">코드가 틀렸거나 만료됐어요. 5번 틀리면 새 코드를 받아야 해요.</p>
      ) : (
        <p className="v3-hint">남은 시간 {mmss(left)}</p>
      )}
      <div className="v3-row">
        <span className="t-caption">메일이 오지 않았나요?</span>
        <button type="button" className="v3-link t-caption" onClick={resend}>다시 보내기{wait > 0 ? ` (${wait}초 후)` : ''}</button>
      </div>
      <p className="v3-hint">데모: 000000 은 틀린 코드로 처리돼요. 그 밖의 6자리는 통과해요.</p>
    </AuthPage>
  );
}

/* ─────────── A4 로그인 ─────────── */
export function Login() {
  const nav = useNavigate();
  const { auth } = useApp();
  const s = usePreview();
  const [f, setF] = useState({ email: s === 'wrong' ? 'user@example.com' : '', pw: s === 'wrong' ? 'wrongpass' : '' });
  const [bad, setBad] = useState(s === 'wrong');
  const [card, setCard] = useState(null);
  const submit = (e) => {
    e?.preventDefault();
    const r = auth.login(f.email.trim(), f.pw);
    if (r.ok) return nav('/');
    if (r.code === 'EMAIL_NOT_VERIFIED') return setCard('EMAIL_NOT_VERIFIED');
    setBad(true);
  };
  return (
    <AuthPage
      title="로그인"
      onBack={() => nav('/start')}
      overlay={card && <ErrorCard code={card} onClose={() => setCard(null)} onAction={[() => nav('/verify')]} />}
    >
      <form className="v3-form" onSubmit={submit} noValidate>
        <h2 className="v3-h2">다시 만나서 반가워요</h2>
        <p className="v3-sub v3-sub--left">오늘의 이야기를 이어서 써 볼까요?</p>
        <Field label="이메일">
          {(id) => <Input id={id} type="email" placeholder="user@example.com" autoComplete="email" value={f.email} onChange={(e) => { setBad(false); setF({ ...f, email: e.target.value }); }} />}
        </Field>
        <Field label="비밀번호" error={bad ? '이메일 또는 비밀번호가 맞지 않아요.' : null}>
          {(id, b) => <Input id={id} type="password" placeholder="••••••••" autoComplete="current-password" invalid={b} value={f.pw} onChange={(e) => { setBad(false); setF({ ...f, pw: e.target.value }); }} />}
        </Field>
        <Button block type="submit" onClick={submit}>로그인</Button>
        <div className="v3-or"><span>또는</span></div>
        <GoogleBtn onClick={() => { auth.google(); nav('/'); }} />
        <p className="v3-center t-body">계정이 없나요? <Link className="v3-link" to="/signup">회원가입</Link></p>
        <p className="v3-hint v3-center">데모 계정: user@example.com / password123</p>
      </form>
    </AuthPage>
  );
}

/* ─────────── A5 개인정보처리방침 (가입 전·마이페이지 공용) ─────────── */
export function Privacy() {
  const nav = useNavigate();
  const half = Math.ceil(POLICY.length / 2);
  const sec = ([h, ps]) => (
    <section key={h} className="v3-policy__sec">
      <h3 className="t-body-strong">{h}</h3>
      {ps.map((p) => (
        <p key={p} className="t-caption">{p}</p>
      ))}
    </section>
  );
  return (
    <Page title="개인정보처리방침" back="close" onBack={() => nav(-1)} bare wide>
      <h2 className="v3-h2">내 사진과 이야기를<br />이렇게 다뤄요</h2>
      <p className="v3-sub v3-sub--left">가입하기 전에 꼭 읽어 주세요.</p>
      <div className="v3-policy">
        <div>{POLICY.slice(0, half).map(sec)}</div>
        <div>{POLICY.slice(half).map(sec)}</div>
      </div>
    </Page>
  );
}

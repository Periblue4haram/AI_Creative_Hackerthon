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
  const [card, setCard] = useState(s === 'google' ? 'INVALID_GOOGLE_TOKEN' : null);
  const google = async () => {
    const r = await auth.google();
    if (r.ok) nav('/');
    else setCard(r.code);
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
      {card && <ErrorCard code={card} onClose={() => setCard(null)} onAction={[google, () => nav('/login')]} />}
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
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ email: s === 'dup' ? 'user@example.com' : '', pw: '', nick: '', agree: s === 'dup' });
  const [err, setErr] = useState(s === 'dup' ? { email: '이미 가입한 이메일이에요. 로그인해 주세요.' } : {});
  const [card, setCard] = useState(s === 'sendfail' ? 'EMAIL_SEND_FAILED' : null);
  const set = (k) => (e) => setF({ ...f, [k]: k === 'agree' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    const er = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) er.email = '이메일 형식을 확인해 주세요.';
    if (f.pw.length < 8) er.pw = '비밀번호는 8자 이상이에요.';
    if (f.nick.trim().length < 2 || f.nick.trim().length > 30) er.nick = '닉네임은 2~30자로 적어 주세요.';
    if (!f.agree) er.agree = '개인정보처리방침에 동의해 주세요.';
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    const r = await auth.signup(f.email.trim(), f.pw, f.nick.trim());
    setBusy(false);
    if (r.ok) return nav('/verify');
    if (r.code === 'EMAIL_TAKEN') return setErr({ email: '이미 가입한 이메일이에요. 로그인해 주세요.' });
    if (r.code === 'NICKNAME_TAKEN') return setErr({ nick: '이미 쓰고 있는 닉네임이에요. 다른 닉네임을 적어 주세요.' });
    if (r.code === 'VALIDATION_FAILED') return setErr({ email: '입력한 내용을 다시 확인해 주세요.' });
    return setCard(r.code); // EMAIL_SEND_FAILED · TOO_MANY_REQUESTS · 네트워크 오류 등
  };

  return (
    <AuthPage
      title="회원가입"
      onBack={() => nav('/start')}
      overlay={card && <ErrorCard code={card} onClose={() => setCard(null)} onAction={[() => (card === 'EMAIL_SEND_FAILED' ? nav('/verify') : setCard(null))]} />}
    >
      <form className="v3-form" onSubmit={submit} noValidate>
        <Field label="이메일" error={err.email}>
          {(id, bad) => <Input id={id} type="email" placeholder="user@example.com" autoComplete="email" invalid={bad} value={f.email} onChange={set('email')} />}
        </Field>
        <Field label="비밀번호" error={err.pw} hint="8자 이상">
          {(id, bad) => <Input id={id} type="password" placeholder="••••••••••" autoComplete="new-password" invalid={bad} value={f.pw} onChange={set('pw')} />}
        </Field>
        <Field label="닉네임" error={err.nick} hint="2~30자 · 다른 사람이 쓰는 닉네임은 쓸 수 없어요">
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
        <GoogleBtn onClick={async () => { const r = await auth.google(); if (r.ok) nav('/'); else setCard(r.code); }} />
        <p className="v3-center t-caption v3-muted">가입하면 메일로 6자리 인증 코드를 보내요</p>
        <Button block type="submit" disabled={busy} onClick={submit}>{busy ? '보내는 중…' : '가입하기'}</Button>
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
  const [left, setLeft] = useState(s ? 600 : auth.secondsToExpire());
  const [wait, setWait] = useState(s ? 48 : auth.secondsToResend());
  const [busy, setBusy] = useState(false);
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
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const r = await auth.verify(digits.join(''));
    setBusy(false);
    if (r.ok) return nav('/', { replace: true });
    if (r.code === 'INVALID_VERIFICATION_CODE' || r.code === 'VALIDATION_FAILED') return setBad(true);
    setCard(r.code);
  };
  const resend = async () => {
    if (wait > 0) return setCard('TOO_MANY_REQUESTS');
    const r = await auth.resend();
    if (r.ok) {
      setWait(60);
      setLeft(600);
      setBad(false);
      setDigits(['', '', '', '', '', '']);
      refs.current[0]?.focus();
      return;
    }
    if (r.code === 'TOO_MANY_REQUESTS') setWait(r.details?.retryAfterSeconds ?? auth.secondsToResend());
    setCard(r.code);
  };

  return (
    <AuthPage
      title="이메일 인증"
      onBack={() => nav('/signup')}
      overlay={card && <ErrorCard code={card} onClose={() => setCard(null)} />}
      foot={<Button block disabled={!full || busy} onClick={submit}>인증하고 시작하기</Button>}
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
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    const r = await auth.login(f.email.trim(), f.pw);
    setBusy(false);
    if (r.ok) return nav('/', { replace: true });
    if (r.code === 'EMAIL_NOT_VERIFIED') return setCard('EMAIL_NOT_VERIFIED');
    if (r.code === 'INVALID_CREDENTIALS' || r.code === 'VALIDATION_FAILED') return setBad(true);
    setCard(r.code);
  };
  return (
    <AuthPage
      title="로그인"
      onBack={() => nav('/start')}
      overlay={card && <ErrorCard code={card} onClose={() => setCard(null)} onAction={[() => (card === 'EMAIL_NOT_VERIFIED' ? nav('/verify') : setCard(null))]} />}
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
        <Button block type="submit" disabled={busy} onClick={submit}>{busy ? '로그인 중…' : '로그인'}</Button>
        <div className="v3-or"><span>또는</span></div>
        <GoogleBtn onClick={async () => { const r = await auth.google(); if (r.ok) nav('/'); else setCard(r.code); }} />
        <p className="v3-center t-body">계정이 없나요? <Link className="v3-link" to="/signup">회원가입</Link></p>
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

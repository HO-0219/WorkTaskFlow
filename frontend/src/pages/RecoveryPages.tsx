import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { AuthLayout, Field, SubmitButton } from '../components';

function RequestPage({ mode }: { mode: 'username' | 'password' }) {
  const [email, setEmail] = useState(''); const [pending, setPending] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState('');
  const isUsername = mode === 'username';
  async function submit(event: FormEvent) { event.preventDefault(); setPending(true); setError(''); try { isUsername ? await api.remindUsername(email) : await api.requestPasswordReset(email); setDone(true); } catch (e) { setError(errorMessage(e)); } finally { setPending(false); } }
  return <AuthLayout title={isUsername ? '아이디 찾기' : '비밀번호 찾기'} description="가입할 때 사용한 이메일을 입력해 주세요.">{done ? <section className="success"><strong>메일함을 확인해 주세요.</strong><p>가입된 계정이 있다면 안내 메일을 전송했습니다.</p><Link to="/login" className="primary link-button">로그인으로 돌아가기</Link></section> : <form className="form" onSubmit={submit}><Field label="이메일" type="email" value={email} onChange={e => setEmail(e.target.value)} required />{error && <p className="error">{error}</p>}<SubmitButton pending={pending}>{isUsername ? '아이디 안내 받기' : '재설정 링크 받기'}</SubmitButton></form>}</AuthLayout>;
}
export function FindUsernamePage() { return <RequestPage mode="username" />; }
export function ForgotPasswordPage() { return <RequestPage mode="password" />; }

export function ResetPasswordPage() {
  const [params] = useSearchParams(); const navigate = useNavigate();
  const email = params.get('email') ?? ''; const token = params.get('token') ?? '';
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) { event.preventDefault(); if (password !== confirm) return setError('비밀번호가 서로 다릅니다.'); setPending(true); setError(''); try { await api.resetPassword(email, token, password); navigate('/login?reset=success'); } catch (e) { setError(errorMessage(e)); } finally { setPending(false); } }
  return <AuthLayout title="새 비밀번호 설정" description="앞으로 사용할 비밀번호를 입력해 주세요."><form className="form" onSubmit={submit}><Field label="새 비밀번호" type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /><Field label="새 비밀번호 확인" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />{(!email || !token) && <p className="error">유효한 재설정 링크가 아닙니다.</p>}{error && <p className="error">{error}</p>}<SubmitButton pending={pending} disabled={!email || !token}>비밀번호 변경</SubmitButton></form></AuthLayout>;
}


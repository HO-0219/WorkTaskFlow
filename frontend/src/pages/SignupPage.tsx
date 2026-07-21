import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../api';
import { AuthLayout, Field, SubmitButton } from '../components';

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', name: '', password: '', passwordConfirm: '', verificationCode: '' });
  const [sent, setSent] = useState(false); const [verified, setVerified] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  const update = (key: keyof typeof form, value: string) => { setForm(current => ({ ...current, [key]: value })); if (key === 'email') { setSent(false); setVerified(false); } };
  async function sendCode() { setPending(true); setError(''); try { await api.sendVerification(form.email); setSent(true); } catch (e) { setError(errorMessage(e)); } finally { setPending(false); } }
  async function verifyCode() { setPending(true); setError(''); try { await api.confirmVerification(form.email, form.verificationCode); setVerified(true); } catch (e) { setError(errorMessage(e)); } finally { setPending(false); } }
  async function submit(event: FormEvent) { event.preventDefault(); if (form.password !== form.passwordConfirm) return setError('비밀번호가 서로 다릅니다.'); if (!verified) return setError('이메일 인증을 완료해 주세요.'); setPending(true); setError(''); try { await api.signup(form); navigate('/login?signup=success'); } catch (e) { setError(errorMessage(e)); } finally { setPending(false); } }
  return <AuthLayout title="회원가입" description="기본 정보를 입력하고 이메일을 인증해 주세요."><form className="form" onSubmit={submit}>
    <Field label="이름" value={form.name} onChange={e => update('name', e.target.value)} minLength={2} required /><Field label="아이디" value={form.username} onChange={e => update('username', e.target.value)} pattern="[A-Za-z0-9_]{4,20}" placeholder="영문, 숫자, 밑줄 4~20자" required />
    <div className="inline-field"><Field label="이메일" type="email" value={form.email} onChange={e => update('email', e.target.value)} disabled={verified} required /><button type="button" onClick={sendCode} disabled={pending || !form.email || verified}>{sent ? '재발송' : '인증번호 받기'}</button></div>
    {sent && <div className="inline-field"><Field label="인증번호" inputMode="numeric" maxLength={6} value={form.verificationCode} onChange={e => update('verificationCode', e.target.value.replace(/\D/g, ''))} disabled={verified} required /><button type="button" onClick={verifyCode} disabled={pending || form.verificationCode.length !== 6 || verified}>{verified ? '인증 완료' : '확인'}</button></div>}
    <Field label="비밀번호" type="password" minLength={8} value={form.password} onChange={e => update('password', e.target.value)} placeholder="8자 이상" required /><Field label="비밀번호 확인" type="password" value={form.passwordConfirm} onChange={e => update('passwordConfirm', e.target.value)} required />
    {error && <p className="error">{error}</p>}<SubmitButton pending={pending} disabled={!verified}>가입하기</SubmitButton></form><p className="bottom-link">이미 계정이 있나요? <Link to="/login">로그인</Link></p></AuthLayout>;
}

import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, MeResponse } from './api';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { FindUsernamePage, ForgotPasswordPage, ResetPasswordPage } from './pages/RecoveryPages';

function HomePage() {
  const navigate = useNavigate(); const [me, setMe] = useState<MeResponse>(); const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      try {
        if (!localStorage.getItem('accessToken')) { const token = await api.refresh(); localStorage.setItem('accessToken', token.accessToken); }
        setMe(await api.me());
      } catch { localStorage.removeItem('accessToken'); }
      finally { setLoading(false); }
    }
    load();
  }, []);
  async function logout() { await api.logout().catch(() => undefined); localStorage.removeItem('accessToken'); navigate('/login'); }
  if (loading) return <main className="center-page">인증 상태 확인 중...</main>;
  if (!me) return <Navigate to="/login" replace />;
  return <main className="center-page"><section className="welcome"><span className="brand-mark">T</span><h1>{me.name}님, 환영합니다.</h1><p>인증 기본 설정이 정상적으로 연결되었습니다.</p><dl><div><dt>아이디</dt><dd>{me.username}</dd></div><div><dt>이메일</dt><dd>{me.email}</dd></div><div><dt>권한</dt><dd>{me.role}</dd></div></dl><button className="secondary" onClick={logout}>로그아웃</button></section></main>;
}

function OAuthCallbackPage() {
  const navigate = useNavigate(); const [failed, setFailed] = useState(false);
  useEffect(() => { api.refresh().then(token => { localStorage.setItem('accessToken', token.accessToken); navigate('/'); }).catch(() => setFailed(true)); }, [navigate]);
  return <main className="center-page">{failed ? <section><p className="error">소셜 로그인을 완료하지 못했습니다.</p><Link to="/login">로그인으로 돌아가기</Link></section> : '소셜 로그인 처리 중...'}</main>;
}

export default function App() {
  return <BrowserRouter><Routes><Route path="/" element={<HomePage />} /><Route path="/login" element={<LoginPage />} /><Route path="/signup" element={<SignupPage />} /><Route path="/find-username" element={<FindUsernamePage />} /><Route path="/forgot-password" element={<ForgotPasswordPage />} /><Route path="/reset-password" element={<ResetPasswordPage />} /><Route path="/oauth/callback" element={<OAuthCallbackPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></BrowserRouter>;
}


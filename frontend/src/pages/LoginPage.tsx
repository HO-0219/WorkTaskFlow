import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage, ProviderResponse } from '../api';
import { AuthLayout, Field, SubmitButton } from '../components';

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState<ProviderResponse>({ google: false, kakao: false });
  useEffect(() => { api.providers().then(setProviders).catch(() => undefined); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError('');
    try { const tokens = await api.login(username, password); localStorage.setItem('accessToken', tokens.accessToken); navigate('/'); }
    catch (caught) { setError(errorMessage(caught)); } finally { setPending(false); }
  }
  return <AuthLayout title="로그인" description="팀 프로젝트에 다시 오신 것을 환영합니다.">
    <form onSubmit={submit} className="form"><Field label="아이디" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required /><Field label="비밀번호" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
      {(error || params.get('socialError')) && <p className="error">{error || '소셜 로그인에 실패했습니다.'}</p>}<SubmitButton pending={pending}>로그인</SubmitButton>
    </form>
    <nav className="text-links"><Link to="/find-username">아이디 찾기</Link><span /><Link to="/forgot-password">비밀번호 찾기</Link><span /><Link to="/signup">회원가입</Link></nav>
    {(providers.google || providers.kakao) && <div className="social"><div className="divider">소셜 계정으로 계속하기</div>{providers.google && <a href={api.socialUrl('google')} className="social-button google">G&nbsp;&nbsp; Google로 계속하기</a>}{providers.kakao && <a href={api.socialUrl('kakao')} className="social-button kakao">●&nbsp;&nbsp; 카카오로 계속하기</a>}</div>}
  </AuthLayout>;
}


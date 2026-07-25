import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, ProviderResponse } from '../../../api/authApi';
import { accessToken, errorMessage, sessionMode } from '../../../api/client';
import { AuthLayout, Field, SubmitButton } from '../components/AuthComponents';
import { useLanguage } from '../../../app/LanguageContext';

export function LoginPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(sessionMode.isDemo());
  const [error, setError] = useState('');
  const [providers, setProviders] = useState<ProviderResponse>({ google: false, kakao: false });
  useEffect(() => {
    authApi.providers().then(setProviders).catch(() => undefined);
    if (sessionMode.isDemo()) {
      authApi.logout().catch(() => undefined).finally(() => {
        accessToken.clear();
        sessionMode.clear();
        setPending(false);
      });
    }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError('');
    try {
      const tokens = await authApi.login(username, password);
      accessToken.set(tokens.accessToken);
      sessionMode.clear();
      const next = params.get('next');
      navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/app');
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setPending(false); }
  }

  return <AuthLayout title={t('로그인', 'Log in')} description={t('ToTaskFlow에 다시 오신 것을 환영합니다.', 'Welcome back to ToTaskFlow.')}>
    <form onSubmit={submit} className="form"><Field label={t('아이디', 'Username')} value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required /><Field label={t('비밀번호', 'Password')} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
      {(error || params.get('socialError')) && <p className="error">{error || t('소셜 로그인에 실패했습니다.', 'Social login failed.')}</p>}<SubmitButton pending={pending}>{t('로그인', 'Log in')}</SubmitButton>
    </form>
    <nav className="text-links"><Link to="/find-username">{t('아이디 찾기', 'Find username')}</Link><span /><Link to="/forgot-password">{t('비밀번호 찾기', 'Reset password')}</Link><span /><Link to="/signup">{t('회원가입', 'Sign up')}</Link></nav>
    <div className="social"><div className="divider">{t('소셜 계정으로 계속하기', 'Continue with a social account')}</div>{providers.google
      ? <a href={authApi.socialUrl('google')} className="social-button google">G&nbsp;&nbsp; {t('Google로 계속하기', 'Continue with Google')}</a>
      : <button type="button" className="social-button google" disabled>G&nbsp;&nbsp; {t('Google 로그인 준비 중', 'Google sign-in coming soon')}</button>}</div>
  </AuthLayout>;
}

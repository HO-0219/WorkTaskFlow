import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../../api/authApi';
import { accessToken, sessionMode } from '../../../api/client';
import { useLanguage } from '../../../app/LanguageContext';

export function OAuthCallbackPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    authApi.refresh().then(token => {
      accessToken.set(token.accessToken, token.expiresIn);
      sessionMode.clear();
      navigate('/app');
    }).catch(() => setFailed(true));
  }, [navigate]);
  return <main className="center-page">{failed ? <section><p className="error">{t('소셜 로그인을 완료하지 못했습니다.', 'Could not complete social login.')}</p><Link to="/login">{t('로그인으로 돌아가기', 'Back to login')}</Link></section> : t('소셜 로그인 처리 중...', 'Completing social login...')}</main>;
}

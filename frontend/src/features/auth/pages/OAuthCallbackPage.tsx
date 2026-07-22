import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../../api/authApi';
import { accessToken } from '../../../api/client';

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    authApi.refresh().then(token => {
      accessToken.set(token.accessToken);
      navigate('/');
    }).catch(() => setFailed(true));
  }, [navigate]);
  return <main className="center-page">{failed ? <section><p className="error">소셜 로그인을 완료하지 못했습니다.</p><Link to="/login">로그인으로 돌아가기</Link></section> : '소셜 로그인 처리 중...'}</main>;
}

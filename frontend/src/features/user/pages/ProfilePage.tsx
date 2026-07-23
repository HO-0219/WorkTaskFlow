import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { accessToken, errorMessage } from '../../../api/client';
import { userApi, UserProfile } from '../../../api/userApi';
import { AppNavigation } from '../../../app/AppNavigation';
import { authApi } from '../../../api/authApi';
import { useLanguage } from '../../../app/LanguageContext';

export function ProfilePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>();
  const [nickname, setNickname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    userApi.profile().then(value => {
      setProfile(value);
      setNickname(value.nickname);
      setPhoneNumber(value.phoneNumber ?? '');
      setProfileImageUrl(value.profileImageUrl ?? '');
    }).catch(value => setError(errorMessage(value))).finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setSaved(false);
    try {
      const updated = await userApi.updateProfile({ nickname, phoneNumber, profileImageUrl });
      setProfile(updated); setSaved(true);
    } catch (value) { setError(errorMessage(value)); }
    finally { setSaving(false); }
  }

  async function logout() {
    await authApi.logout().catch(() => undefined);
    accessToken.clear();
    navigate('/login');
  }

  if (!accessToken.get()) return <Navigate to="/login" replace />;
  if (loading) return <main className="center-page">프로필을 불러오는 중...</main>;
  return <><AppNavigation /><main className="profile-page app-page"><header className="profile-page-header"><span className="page-eyebrow">MY PROFILE</span><h1>{t('프로필', 'Profile')}</h1><p>{t('나를 표현하는 정보를 편하게 관리하세요.', 'Manage how you appear to your teammates.')}</p></header><section className="profile-card-new">
    <div className="profile-hero"><div className="profile-avatar">{profileImageUrl ? <img src={profileImageUrl} alt="프로필" /> : nickname.slice(0, 1)}</div><div><h2>{nickname}</h2>{profile && <p>{profile.username} · {profile.email}</p>}</div></div>
    <form className="form" onSubmit={submit}>
      <label className="field"><span>닉네임</span><input value={nickname} onChange={event => setNickname(event.target.value)} minLength={1} maxLength={30} required /></label>
      <label className="field"><span>전화번호</span><input value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="010-1234-5678" maxLength={20} /></label>
      <label className="field"><span>프로필 이미지 URL</span><input type="url" value={profileImageUrl} onChange={event => setProfileImageUrl(event.target.value)} maxLength={500} /></label>
      {error && <p className="error">{error}</p>}{saved && <p className="success-message">프로필을 저장했습니다.</p>}
      <button className="primary" disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
    </form>
    <div className="profile-secondary-actions"><Link className="account-link" to="/account">{t('계정 및 보안 설정', 'Account & security')} →</Link><button className="profile-logout" type="button" onClick={logout}>{t('로그아웃', 'Log out')}</button></div>
  </section></main></>;
}

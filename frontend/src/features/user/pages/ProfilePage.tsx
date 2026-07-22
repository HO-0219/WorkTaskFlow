import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { accessToken, errorMessage } from '../../../api/client';
import { userApi, UserProfile } from '../../../api/userApi';

export function ProfilePage() {
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

  if (!accessToken.get()) return <Navigate to="/login" replace />;
  if (loading) return <main className="center-page">프로필을 불러오는 중...</main>;
  return <main className="center-page"><section className="auth-card profile-card">
    <Link to="/">← 홈으로</Link><h1>내 프로필</h1>
    {profile && <p className="muted">{profile.username} · {profile.email}</p>}
    <form className="form" onSubmit={submit}>
      <label className="field"><span>닉네임</span><input value={nickname} onChange={event => setNickname(event.target.value)} minLength={1} maxLength={30} required /></label>
      <label className="field"><span>전화번호</span><input value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="010-1234-5678" maxLength={20} /></label>
      <label className="field"><span>프로필 이미지 URL</span><input type="url" value={profileImageUrl} onChange={event => setProfileImageUrl(event.target.value)} maxLength={500} /></label>
      {error && <p className="error">{error}</p>}{saved && <p className="success-message">프로필을 저장했습니다.</p>}
      <button className="primary" disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
    </form>
    <Link className="account-link" to="/account">비밀번호 변경·회원 탈퇴 →</Link>
  </section></main>;
}

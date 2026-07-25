import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { accessToken, errorMessage, sessionMode } from '../../../api/client';
import { userApi } from '../../../api/userApi';
import { useLanguage } from '../../../app/LanguageContext';

export function AccountPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [withdrawPassword, setWithdrawPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function changePassword(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await userApi.changePassword(currentPassword, newPassword);
      accessToken.clear();
      sessionMode.clear();
      navigate('/login', { replace: true });
    } catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  }

  async function withdraw() {
    if (!window.confirm(t('탈퇴하면 개인정보가 익명화되고 다시 로그인할 수 없습니다. 계속할까요?', 'Your personal data will be anonymized and you will no longer be able to log in. Continue?'))) return;
    setBusy(true); setError('');
    try {
      await userApi.withdraw(withdrawPassword);
      accessToken.clear();
      sessionMode.clear();
      navigate('/login', { replace: true });
    } catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  }

  if (!accessToken.get()) return <Navigate to="/login" replace />;
  return <main className="center-page"><section className="auth-card profile-card">
    <Link to="/profile">← {t('프로필로', 'Back to profile')}</Link><h1>{t('계정 설정', 'Account settings')}</h1>
    <p className="muted">{t('비밀번호 변경 후에는 모든 기기에서 다시 로그인해야 합니다.', 'After changing your password, you must log in again on every device.')}</p>
    <Link className="account-link" to="/payments">{t('결제수단 및 테스트 관리', 'Manage payment methods and tests')} →</Link>
    <form className="form" onSubmit={changePassword}>
      <label className="field"><span>{t('현재 비밀번호', 'Current password')}</span><input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required /></label>
      <label className="field"><span>{t('새 비밀번호', 'New password')}</span><input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={8} maxLength={72} required /></label>
      <button className="primary" disabled={busy}>{t('비밀번호 변경', 'Change password')}</button>
    </form>
    <div className="danger-zone">
      <h2>{t('회원 탈퇴', 'Delete account')}</h2><p>{t('일반 계정은 현재 비밀번호가 필요합니다. 소셜 계정은 최근 5분 이내 재로그인이 필요합니다.', 'Password accounts require the current password. Social accounts require a login within the last five minutes.')}</p>
      <label className="field"><span>{t('현재 비밀번호(소셜 계정은 비워 둠)', 'Current password (leave blank for social accounts)')}</span><input type="password" value={withdrawPassword} onChange={event => setWithdrawPassword(event.target.value)} /></label>
      <button className="danger-button" type="button" disabled={busy} onClick={withdraw}>{t('회원 탈퇴', 'Delete account')}</button>
    </div>
    {error && <p className="error account-error">{error}</p>}
  </section></main>;
}

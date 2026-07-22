import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { accessToken, errorMessage } from '../../../api/client';
import { userApi } from '../../../api/userApi';

export function AccountPage() {
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
      navigate('/login', { replace: true });
    } catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  }

  async function withdraw() {
    if (!window.confirm('탈퇴하면 개인정보가 익명화되고 다시 로그인할 수 없습니다. 계속할까요?')) return;
    setBusy(true); setError('');
    try {
      await userApi.withdraw(withdrawPassword);
      accessToken.clear();
      navigate('/login', { replace: true });
    } catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  }

  if (!accessToken.get()) return <Navigate to="/login" replace />;
  return <main className="center-page"><section className="auth-card profile-card">
    <Link to="/profile">← 프로필로</Link><h1>계정 설정</h1>
    <p className="muted">비밀번호 변경 후에는 모든 기기에서 다시 로그인해야 합니다.</p>
    <form className="form" onSubmit={changePassword}>
      <label className="field"><span>현재 비밀번호</span><input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required /></label>
      <label className="field"><span>새 비밀번호</span><input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={8} maxLength={72} required /></label>
      <button className="primary" disabled={busy}>비밀번호 변경</button>
    </form>
    <div className="danger-zone">
      <h2>회원 탈퇴</h2><p>일반 계정은 현재 비밀번호가 필요합니다. 소셜 계정은 최근 5분 이내 재로그인이 필요합니다.</p>
      <label className="field"><span>현재 비밀번호(소셜 계정은 비워 둠)</span><input type="password" value={withdrawPassword} onChange={event => setWithdrawPassword(event.target.value)} /></label>
      <button className="danger-button" type="button" disabled={busy} onClick={withdraw}>회원 탈퇴</button>
    </div>
    {error && <p className="error account-error">{error}</p>}
  </section></main>;
}

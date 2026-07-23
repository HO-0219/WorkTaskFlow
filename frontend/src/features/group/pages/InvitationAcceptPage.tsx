import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { groupApi, MemberResponse } from '../../../api/groupApi';
import { accessToken, errorMessage } from '../../../api/client';

export function InvitationAcceptPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [member, setMember] = useState<MemberResponse>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (!accessToken.get()) {
    const next = `/group-invitations/accept?token=${encodeURIComponent(token)}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  async function accept() {
    setPending(true);
    setError('');
    try {
      setMember(await groupApi.acceptInvitation(token));
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setPending(false);
    }
  }

  return <main className="center-page"><section className="auth-card profile-card invitation-accept-card"><span className="brand-mark">T</span><h1>그룹 초대</h1>{member ? <div className="success"><strong>그룹에 참여했습니다.</strong><p>{member.nickname}님이 팀원으로 등록되었습니다.</p><Link className="primary link-button" to="/groups">내 그룹 확인</Link></div> : <><p className="muted">초대 내용을 확인하고 그룹 참여를 수락해 주세요. 이메일로 받은 초대는 해당 이메일 계정으로 로그인해야 합니다.</p>{!token && <p className="error">초대 토큰이 없습니다.</p>}{error && <p className="error">{error}</p>}<button className="primary invitation-accept-button" disabled={!token || pending} onClick={accept}>{pending ? '처리 중...' : '초대 수락'}</button><Link className="account-link" to="/groups">나중에 하기</Link></>}</section></main>;
}

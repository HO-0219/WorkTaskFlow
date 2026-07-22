import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { groupApi, GroupResponse, InvitationResponse, MemberResponse } from '../../../api/groupApi';
import { accessToken, errorMessage } from '../../../api/client';

export function GroupDetailPage() {
  const { groupId: rawGroupId } = useParams();
  const groupId = Number(rawGroupId);
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupResponse>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState('Asia/Seoul');
  const [visibility, setVisibility] = useState<'LEADER_ONLY' | 'MEMBERS'>('MEMBERS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [memberList, setMemberList] = useState<MemberResponse[]>([]);
  const [invitationList, setInvitationList] = useState<InvitationResponse[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePending, setInvitePending] = useState(false);
  const [memberPending, setMemberPending] = useState<number>();

  useEffect(() => {
    if (!Number.isInteger(groupId) || groupId < 1) {
      setError('올바르지 않은 그룹 주소입니다.');
      setLoading(false);
      return;
    }
    groupApi.get(groupId).then((value) => {
      setGroup(value);
      setName(value.name);
      setDescription(value.description ?? '');
      setTimezone(value.timezone);
      setVisibility(value.dashboardVisibility);
      groupApi.members(groupId).then(setMemberList).catch((caught) => setError(errorMessage(caught)));
      if (value.type === 'TEAM' && value.role === 'LEADER') {
        groupApi.invitations(groupId).then(setInvitationList).catch((caught) => setError(errorMessage(caught)));
      }
    }).catch((value) => setError(errorMessage(value))).finally(() => setLoading(false));
  }, [groupId]);

  async function update(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const updated = await groupApi.update(groupId, {
        name, description, timezone,
        dashboardVisibility: group?.type === 'PERSONAL' ? 'MEMBERS' : visibility,
      });
      setGroup(updated);
      setSaved(true);
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setSaving(false);
    }
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    setInvitePending(true);
    setError('');
    try {
      const created = await groupApi.invite(groupId, inviteEmail);
      setInvitationList((current) => [created, ...current]);
      setInviteEmail('');
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setInvitePending(false);
    }
  }

  async function cancelInvitation(invitationId: number) {
    setError('');
    try {
      await groupApi.cancelInvitation(groupId, invitationId);
      setInvitationList((current) => current.map((value) =>
        value.id === invitationId ? { ...value, status: 'CANCELLED' } : value));
    } catch (value) {
      setError(errorMessage(value));
    }
  }

  async function changeRole(member: MemberResponse, role: 'LEADER' | 'MEMBER') {
    if (member.role === role) return;
    setMemberPending(member.id);
    setError('');
    try {
      const updated = await groupApi.changeMemberRole(groupId, member.id, role);
      setMemberList((current) => current.map((value) => value.id === updated.id ? updated : value));
      if (group?.memberId === updated.id) setGroup({ ...group, role: updated.role });
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setMemberPending(undefined);
    }
  }

  async function removeMember(member: MemberResponse) {
    if (!window.confirm(`${member.nickname}님을 그룹에서 내보낼까요?`)) return;
    setMemberPending(member.id);
    setError('');
    try {
      await groupApi.removeMember(groupId, member.id);
      setMemberList((current) => current.filter((value) => value.id !== member.id));
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setMemberPending(undefined);
    }
  }

  async function leaveGroup() {
    if (!window.confirm('이 그룹에서 탈퇴할까요? 마지막 팀장은 먼저 다른 멤버에게 팀장 역할을 넘겨야 합니다.')) return;
    setMemberPending(group?.memberId);
    setError('');
    try {
      await groupApi.leave(groupId);
      navigate('/groups', { replace: true });
    } catch (value) {
      setError(errorMessage(value));
      setMemberPending(undefined);
    }
  }

  if (!accessToken.get()) return <Navigate to="/login" replace />;
  if (loading) return <main className="center-page">그룹을 불러오는 중...</main>;
  return <main className="center-page"><section className="auth-card profile-card group-detail-card">
    <Link to="/groups">← 그룹 목록으로</Link>
    <div className="group-detail-title"><span className={`group-type ${group?.type.toLowerCase()}`}>{group?.type === 'PERSONAL' ? '개인' : '팀'}</span><h1>{group?.name ?? '그룹 상세'}</h1></div>
    {group && <p className="muted">내 역할: {group.role === 'LEADER' ? '팀장' : '팀원'} · 멤버십 #{group.memberId}</p>}
    {group && <div className="group-primary-links"><Link className="primary group-tasks-link" to={`/groups/${group.id}/tasks`}>업무 목록·등록</Link><Link className="secondary" to={`/groups/${group.id}/dashboard`}>대시보드</Link><Link className="secondary" to={`/calendar?groupId=${group.id}`}>캘린더</Link></div>}
    {group?.role === 'LEADER' ? <form className="form" onSubmit={update}>
      <label className="field"><span>그룹 이름</span><input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="field"><span>설명</span><textarea maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <label className="field"><span>시간대</span><input required maxLength={50} value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label>
      {group.type === 'TEAM' && <label className="field"><span>대시보드 공개 범위</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as 'LEADER_ONLY' | 'MEMBERS')}><option value="MEMBERS">모든 멤버</option><option value="LEADER_ONLY">팀장만</option></select></label>}
      {saved && <p className="success-message">그룹 설정을 저장했습니다.</p>}
      <button className="primary" disabled={saving}>{saving ? '저장 중...' : '설정 저장'}</button>
    </form> : <div className="readonly-settings">
      <dl><div><dt>설명</dt><dd>{group?.description || '설명 없음'}</dd></div><div><dt>시간대</dt><dd>{group?.timezone}</dd></div><div><dt>대시보드</dt><dd>{group?.dashboardVisibility === 'MEMBERS' ? '모든 멤버' : '팀장만'}</dd></div></dl>
      <p>설정 변경은 그룹 팀장만 할 수 있습니다.</p>
    </div>}
    {group && error && <p className="error group-global-error">{error}</p>}
    {!group && error && <p className="error">{error}</p>}
    {group && <section className="group-subsection"><h2>멤버 {memberList.length}명</h2><div className="member-list">{memberList.map((member) => <div className="member-row" key={member.id}><span className="member-avatar">{member.nickname.slice(0, 1)}</span><div className="member-info"><strong>{member.nickname}{member.id === group.memberId ? ' (나)' : ''}</strong><small>{member.role === 'LEADER' ? '팀장' : '팀원'} · 멤버 #{member.id}</small></div>{group.type === 'TEAM' && group.role === 'LEADER' && <div className="member-actions"><select aria-label={`${member.nickname} 역할`} value={member.role} disabled={memberPending === member.id} onChange={(event) => changeRole(member, event.target.value as 'LEADER' | 'MEMBER')}><option value="LEADER">팀장</option><option value="MEMBER">팀원</option></select>{member.id !== group.memberId && <button type="button" disabled={memberPending === member.id} onClick={() => removeMember(member)}>내보내기</button>}</div>}</div>)}</div>{group.type === 'TEAM' && <button className="leave-group-button" type="button" disabled={memberPending === group.memberId} onClick={leaveGroup}>그룹 탈퇴</button>}</section>}
    {group?.type === 'TEAM' && group.role === 'LEADER' && <section className="group-subsection invitation-section"><h2>멤버 초대</h2><form className="inline-invite" onSubmit={invite}><input type="email" required maxLength={255} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="초대할 이메일" /><button className="secondary" disabled={invitePending}>{invitePending ? '전송 중...' : '초대 전송'}</button></form><p className="section-help">로컬에서는 수락 링크가 백엔드의 [LOCAL MAIL] 로그에 표시됩니다.</p><div className="invitation-list">{invitationList.map((invitation) => <div className="invitation-row" key={invitation.id}><div><strong>{invitation.email}</strong><small>{invitation.status}</small></div>{invitation.status === 'PENDING' && <button type="button" onClick={() => cancelInvitation(invitation.id)}>취소</button>}</div>)}</div></section>}
  </section></main>;
}

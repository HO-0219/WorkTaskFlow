import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { groupApi, GroupResponse, InvitationResponse, InviteLinkResponse, MemberResponse } from '../../../api/groupApi';
import { accessToken, errorMessage } from '../../../api/client';
import { AppNavigation } from '../../../app/AppNavigation';

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
  const [inviteMode, setInviteMode] = useState<'EMAIL' | 'LINK' | 'KEY'>('EMAIL');
  const [inviteLink, setInviteLink] = useState<InviteLinkResponse>();
  const [linkCopied, setLinkCopied] = useState(false);
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
        groupApi.inviteLinks(groupId).then((links) => setInviteLink(links[0])).catch((caught) => setError(errorMessage(caught)));
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

  async function createInviteLink() {
    setInvitePending(true);
    setLinkCopied(false);
    setError('');
    try {
      setInviteLink(await groupApi.createInviteLink(groupId));
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setInvitePending(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink?.url) return;
    try {
      await navigator.clipboard.writeText(inviteLink.url);
      setLinkCopied(true);
    } catch {
      setError('링크를 복사하지 못했습니다. 링크를 직접 선택해 복사해 주세요.');
    }
  }

  async function revokeInviteLink() {
    if (!inviteLink) return;
    setInvitePending(true);
    setError('');
    try {
      await groupApi.revokeInviteLink(groupId, inviteLink.id);
      setInviteLink(undefined);
      setLinkCopied(false);
    } catch (value) {
      setError(errorMessage(value));
    } finally {
      setInvitePending(false);
    }
  }

  async function changeRole(member: MemberResponse, role: 'LEADER' | 'MEMBER') {
    if (member.role === role) return;
    if (role === 'LEADER' && !window.confirm(`${member.nickname}님에게 팀장 권한을 부여할까요?\n\n팀장은 그룹 설정, 멤버 관리와 초대 권한을 갖게 됩니다.`)) return;
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
  return <><AppNavigation /><main className="group-detail-page app-page"><section className="auth-card profile-card group-detail-card">
    <Link to="/groups">← 그룹 목록으로</Link>
    <div className="group-detail-title"><span className={`group-type ${group?.type.toLowerCase()}`}>{group?.type === 'PERSONAL' ? '개인 일정' : '팀'}</span><div><h1>{group?.type === 'PERSONAL' ? '개인 캘린더 설정' : '그룹 설정'}</h1>{group && <p>{group.type === 'PERSONAL' ? '내 일정의 기본 정보를 관리합니다.' : `${group.name} · ${group.role === 'LEADER' ? '팀장' : '팀원'}`}</p>}</div></div>
    {group && <nav className="group-primary-links" aria-label="그룹 바로가기">{group.type === 'PERSONAL' ? <Link className="secondary" to={`/calendar?groupId=${group.id}`}>캘린더</Link> : <><Link className="secondary" to={`/groups/${group.id}/dashboard`}>대시보드</Link><Link className="secondary group-tasks-link" to={`/groups/${group.id}/tasks`}>업무</Link><Link className="secondary" to={`/calendar?groupId=${group.id}`}>캘린더</Link></>}</nav>}
    {group?.role === 'LEADER' ? <section className="group-settings-section"><header><h2>기본 설정</h2><p>이름, 설명과 그룹에서 사용할 기준 시간대를 관리합니다.</p></header><form className="form" onSubmit={update}>
      <label className="field"><span>{group.type === 'PERSONAL' ? '캘린더 이름' : '그룹 이름'}</span><input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="field"><span>설명</span><textarea maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <label className="field"><span>기준 시간대</span><select required value={timezone} onChange={(event) => setTimezone(event.target.value)}>{timezoneOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select><small className="field-help">업무 마감과 캘린더 알림 계산에 사용됩니다.</small></label>
      {group.type === 'TEAM' && <label className="field"><span>대시보드 공개 범위</span><select value={visibility} onChange={(event) => setVisibility(event.target.value as 'LEADER_ONLY' | 'MEMBERS')}><option value="MEMBERS">모든 팀원이 볼 수 있음</option><option value="LEADER_ONLY">팀장만 볼 수 있음</option></select></label>}
      {saved && <p className="success-message">그룹 설정을 저장했습니다.</p>}
      <button className="primary" disabled={saving}>{saving ? '저장 중...' : '설정 저장'}</button>
    </form></section> : <section className="group-settings-section readonly-settings"><header><h2>기본 정보</h2><p>설정 변경은 그룹 팀장만 할 수 있습니다.</p></header>
      <dl><div><dt>설명</dt><dd>{group?.description || '설명 없음'}</dd></div><div><dt>시간대</dt><dd>{group?.timezone}</dd></div><div><dt>대시보드</dt><dd>{group?.dashboardVisibility === 'MEMBERS' ? '모든 멤버' : '팀장만'}</dd></div></dl>
    </section>}
    {group?.type === 'TEAM' && <section className="group-subsection membership-section"><header className="group-section-heading"><div><h2>그룹 멤버십</h2><p>그룹에 적용되는 리포트 제공 범위입니다.</p></div><span className={`membership-badge ${group.membershipPlan.toLowerCase()}`}>{group.membershipPlan === 'PAID' ? '유료' : '무료'}</span></header>{group.membershipPlan === 'PAID' ? <div className="membership-benefits"><strong>유료 그룹</strong><p>리포트 다운로드 제한 없음 · 월 리포트 월 1회 자동 PDF 메일 발송</p><small>AI 리포트 분석은 임태욱 팀원의 테스트 데이터 개발 후 연결 예정입니다.</small></div> : <div className="membership-benefits"><strong>무료 그룹</strong><p>AI 없이 저장된 업무 데이터로 기본 리포트를 제공합니다.</p><small>그룹 리포트는 주 2회까지 생성할 수 있으며, 팀원 개인 리포트는 주간·월간·연간으로 제공됩니다.</small></div>}</section>}
    {group && error && <p className="error group-global-error">{error}</p>}
    {!group && error && <p className="error">{error}</p>}
    {group && <section className="group-subsection"><header className="group-section-heading"><div><h2>멤버</h2><p>{memberList.length}명이 함께하고 있습니다.</p></div></header><div className="member-list">{memberList.map((member) => <div className="member-row" key={member.id}><span className="member-avatar">{member.nickname.slice(0, 1)}</span><div className="member-info"><strong>{member.nickname}{member.id === group.memberId ? ' (나)' : ''}</strong><small>{member.role === 'LEADER' ? '팀장' : '팀원'}</small></div>{group.type === 'TEAM' && group.role === 'LEADER' && <div className="member-actions"><select aria-label={`${member.nickname} 역할`} value={member.role} disabled={memberPending === member.id} onChange={(event) => changeRole(member, event.target.value as 'LEADER' | 'MEMBER')}><option value="LEADER">팀장</option><option value="MEMBER">팀원</option></select>{member.id !== group.memberId && <button type="button" disabled={memberPending === member.id} onClick={() => removeMember(member)}>내보내기</button>}</div>}</div>)}</div>{group.type === 'TEAM' && <button className="leave-group-button" type="button" disabled={memberPending === group.memberId} onClick={leaveGroup}>그룹 탈퇴</button>}</section>}
    {group?.type === 'TEAM' && group.role === 'LEADER' && <section className="group-subsection invitation-section"><header className="group-section-heading"><div><h2>멤버 초대</h2><p>이메일, 링크 또는 그룹 키를 공유할 수 있습니다.</p></div></header><div className="invite-method-tabs"><button className={inviteMode === 'EMAIL' ? 'active' : ''} type="button" onClick={() => setInviteMode('EMAIL')}>이메일 초대</button><button className={inviteMode === 'LINK' ? 'active' : ''} type="button" onClick={() => setInviteMode('LINK')}>초대 링크</button><button className={inviteMode === 'KEY' ? 'active' : ''} type="button" onClick={() => setInviteMode('KEY')}>그룹 키</button></div>
      {inviteMode === 'EMAIL' ? <><form className="inline-invite" onSubmit={invite}><input type="email" required maxLength={255} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="초대할 이메일" /><button className="secondary" disabled={invitePending}>{invitePending ? '전송 중...' : '초대 메일 보내기'}</button></form><div className="invitation-list">{invitationList.map((invitation) => <div className="invitation-row" key={invitation.id}><div><strong>{invitation.email}</strong><small>{invitationStatus(invitation.status)} · {formatDate(invitation.expiresAt)}까지</small></div>{invitation.status === 'PENDING' && <button type="button" onClick={() => cancelInvitation(invitation.id)}>취소</button>}</div>)}</div></> :
      inviteMode === 'LINK' ? <div className="invite-link-panel">{inviteLink ? <>{inviteLink.url ? <label><span>공유할 초대 링크</span><div><input readOnly value={inviteLink.url} onFocus={(event) => event.currentTarget.select()} /><button className="primary" type="button" onClick={copyInviteLink}>{linkCopied ? '복사됨' : '링크 복사'}</button></div></label> : <p>현재 사용 중인 초대 링크가 있습니다. 보안을 위해 페이지를 벗어나면 링크 주소는 다시 표시되지 않습니다.</p>}<p>{formatDate(inviteLink.expiresAt)}까지 여러 명이 사용할 수 있습니다.</p><div className="invite-link-actions">{!inviteLink.url && <button className="secondary" type="button" disabled={invitePending} onClick={createInviteLink}>새 링크로 교체</button>}<button className="invite-link-revoke" type="button" disabled={invitePending} onClick={revokeInviteLink}>링크 사용 중지</button></div></> : <><p>하나의 링크를 팀원들에게 공유하면 이메일을 하나씩 입력하지 않아도 됩니다. 링크는 72시간 동안 유효합니다.</p><button className="primary" type="button" disabled={invitePending} onClick={createInviteLink}>{invitePending ? '생성 중...' : '초대 링크 만들기'}</button></>}</div> :
      <div className="group-key-panel"><p>팀원이 그룹 화면에서 아래 키를 입력하면 바로 참여할 수 있습니다.</p><strong>{group.joinCode}</strong><small>그룹 키는 초대 대상에게만 공유해 주세요.</small></div>}
    </section>}
  </section></main></>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
function invitationStatus(status: InvitationResponse['status']) {
  return { PENDING: '대기 중', ACCEPTED: '수락됨', CANCELLED: '취소됨', EXPIRED: '만료됨' }[status];
}

const timezoneOptions = [
  { value: 'Asia/Seoul', label: '서울 (UTC+09:00)' }, { value: 'Asia/Tokyo', label: '도쿄 (UTC+09:00)' },
  { value: 'Asia/Shanghai', label: '상하이 (UTC+08:00)' }, { value: 'Asia/Singapore', label: '싱가포르 (UTC+08:00)' },
  { value: 'America/Los_Angeles', label: '로스앤젤레스' }, { value: 'America/New_York', label: '뉴욕' },
  { value: 'Europe/London', label: '런던' }, { value: 'Europe/Paris', label: '파리' }, { value: 'UTC', label: 'UTC' },
];

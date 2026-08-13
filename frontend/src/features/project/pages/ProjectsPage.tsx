import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { accessToken, errorMessage } from '../../../api/client';
import { groupApi, GroupFeaturePolicy, GroupResponse, MemberResponse } from '../../../api/groupApi';
import { projectApi, ProjectResponse, ProjectStatus } from '../../../api/projectApi';
import { AppNavigation, Modal } from '../../../app/AppNavigation';
import { useLanguage } from '../../../app/LanguageContext';

const statusLabels: Record<ProjectStatus, [string, string]> = {
  PLANNED: ['계획', 'Planned'], ACTIVE: ['진행 중', 'Active'], ON_HOLD: ['보류', 'On hold'],
  COMPLETED: ['완료', 'Completed'], ARCHIVED: ['보관됨', 'Archived'],
};

export function ProjectsPage() {
  const { t, language } = useLanguage();
  const groupId = Number(useParams().groupId);
  const [group, setGroup] = useState<GroupResponse>();
  const [features, setFeatures] = useState<GroupFeaturePolicy>();
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [editing, setEditing] = useState<ProjectResponse>();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leadMemberId, setLeadMemberId] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNED');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!Number.isInteger(groupId) || groupId < 1) { setLoading(false); return; }
    Promise.all([groupApi.get(groupId), groupApi.features(groupId), groupApi.members(groupId), projectApi.list(groupId)])
      .then(([groupValue, featureValue, memberValues, projectValues]) => {
        setGroup(groupValue); setFeatures(featureValue); setMembers(memberValues); setProjects(projectValues);
      }).catch((value) => setError(errorMessage(value))).finally(() => setLoading(false));
  }, [groupId]);

  function openCreate() {
    setEditing(undefined); setName(''); setDescription(''); setLeadMemberId(''); setStatus('PLANNED');
    setStartDate(''); setDueDate(''); setError(''); setShowForm(true);
  }

  function openEdit(project: ProjectResponse) {
    setEditing(project); setName(project.name); setDescription(project.description ?? '');
    setLeadMemberId(project.leadMemberId?.toString() ?? ''); setStatus(project.status);
    setStartDate(project.startDate ?? ''); setDueDate(project.dueDate ?? ''); setError(''); setShowForm(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    const input = { name: name.trim(), description: description.trim() || undefined,
      leadMemberId: leadMemberId ? Number(leadMemberId) : undefined,
      startDate: startDate || undefined, dueDate: dueDate || undefined };
    try {
      if (editing) {
        const updated = await projectApi.update(editing.id, { ...input, status, expectedVersion: editing.version });
        setProjects((current) => current.map((value) => value.id === updated.id ? updated : value));
      } else {
        const created = await projectApi.create(groupId, input);
        setProjects((current) => [created, ...current]);
      }
      setShowForm(false);
    } catch (value) { setError(errorMessage(value)); }
    finally { setSaving(false); }
  }

  async function archive(project: ProjectResponse) {
    if (!window.confirm(t(`‘${project.name}’ 프로젝트를 보관할까요?`, `Archive “${project.name}”?`))) return;
    try {
      await projectApi.archive(project.id, project.version);
      setProjects((current) => current.map((value) => value.id === project.id
        ? { ...value, status: 'ARCHIVED', version: value.version + 1 } : value));
    } catch (value) { setError(errorMessage(value)); }
  }

  if (!accessToken.get()) return <Navigate to="/login" replace />;
  if (loading) return <main className="center-page">{t('프로젝트를 불러오는 중...', 'Loading projects...')}</main>;
  if (!group || group.type !== 'TEAM') return <Navigate to={`/groups/${groupId}`} replace />;
  const visible = projects.filter((project) => project.status !== 'ARCHIVED');
  const archived = projects.filter((project) => project.status === 'ARCHIVED');
  const label = (value: [string, string]) => value[language === 'ko' ? 0 : 1];
  return <><AppNavigation /><main className="projects-page app-page">
    <header className="projects-header"><div><Link to={`/groups/${groupId}`}>← {t('그룹으로', 'Back to group')}</Link>
      <span className="page-eyebrow">PROJECT FLOW</span><h1>{group.name} {t('프로젝트', 'Projects')}</h1>
      <p>{t('프로젝트를 만들고 다음 단계에서 대분류와 이슈를 연결합니다.', 'Create projects, then organize categories and issues in the next stage.')}</p></div>
      {group.role === 'LEADER' && <button className="primary" type="button" onClick={openCreate}>＋ {t('프로젝트 만들기', 'Create project')}</button>}
    </header>
    {features && <section className="project-plan-summary">
      <div><span>{t('현재 플랜', 'Current plan')}</span><strong>{features.membershipPlan}</strong></div>
      <div><span>{t('채팅 보관', 'Chat retention')}</span><strong>{t(`${features.messageRetentionDays}일`, `${features.messageRetentionDays} days`)}</strong></div>
      <div><span>{t('채팅 채널', 'Chat channels')}</span><strong>{features.multipleChatChannels ? t(`최대 ${features.chatChannelLimit}개`, `Up to ${features.chatChannelLimit}`) : t('그룹 공용 1개', '1 group channel')}</strong></div>
      <div><span>{t('그룹 저장공간', 'Group storage')}</span><strong>{formatBytes(features.storageLimitBytes)}</strong></div>
    </section>}
    {error && <p className="error">{error}</p>}
    <section className="project-list-card"><div className="project-list-heading"><h2>{t('진행 프로젝트', 'Current projects')}</h2><strong>{visible.length}</strong></div>
      {visible.length === 0 ? <p className="empty-state">{t('아직 프로젝트가 없습니다. 첫 프로젝트를 만들어 협업 흐름을 시작하세요.', 'No projects yet. Create one to begin the collaboration flow.')}</p>
        : <div className="project-grid">{visible.map((project) => <article className="project-card" key={project.id}>
          <div className="project-card-top"><span className={`project-status status-${project.status.toLowerCase()}`}>{label(statusLabels[project.status])}</span><small>#{project.id}</small></div>
          <h2><Link to={`/projects/${project.id}/flow`}>{project.name}</Link></h2><p>{project.description || t('프로젝트 설명이 없습니다.', 'No project description.')}</p>
          <dl><div><dt>{t('담당 리더', 'Project lead')}</dt><dd>{project.leadNickname ?? t('미지정', 'Unassigned')}</dd></div>
            <div><dt>{t('기간', 'Schedule')}</dt><dd>{project.startDate ?? '—'} ~ {project.dueDate ?? '—'}</dd></div></dl>
          <div className="project-card-actions"><Link className="primary button-link" to={`/projects/${project.id}/flow`}>{t('Flow 열기', 'Open flow')}</Link>{project.canManage && <><button className="secondary" type="button" onClick={() => openEdit(project)}>{t('수정', 'Edit')}</button><button className="danger" type="button" onClick={() => archive(project)}>{t('보관', 'Archive')}</button></>}</div>
        </article>)}</div>}
    </section>
    {archived.length > 0 && <details className="archived-projects"><summary>{t(`보관된 프로젝트 ${archived.length}개`, `${archived.length} archived projects`)}</summary><ul>{archived.map((project) => <li key={project.id}><Link to={`/projects/${project.id}/flow`}>{project.name}</Link></li>)}</ul></details>}
    {showForm && <Modal title={editing ? t('프로젝트 수정', 'Edit project') : t('새 프로젝트', 'New project')} onClose={() => setShowForm(false)}>
      <form className="form modal-form" onSubmit={save}>
        <label className="field"><span>{t('프로젝트 이름', 'Project name')}</span><input autoFocus required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="field"><span>{t('설명', 'Description')}</span><textarea maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label className="field"><span>{t('프로젝트 리더', 'Project lead')}</span><select value={leadMemberId} onChange={(event) => setLeadMemberId(event.target.value)}><option value="">{t('미지정', 'Unassigned')}</option>{members.filter((member) => member.status === 'ACTIVE').map((member) => <option value={member.id} key={member.id}>{member.nickname}</option>)}</select></label>
        {editing && <label className="field"><span>{t('상태', 'Status')}</span><select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>{Object.entries(statusLabels).filter(([value]) => value !== 'ARCHIVED').map(([value, text]) => <option value={value} key={value}>{label(text)}</option>)}</select></label>}
        <div className="project-date-fields"><label className="field"><span>{t('시작일', 'Start date')}</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label className="field"><span>{t('종료일', 'Due date')}</span><input type="date" min={startDate || undefined} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>
        <div className="modal-actions"><button className="secondary" type="button" onClick={() => setShowForm(false)}>{t('취소', 'Cancel')}</button><button className="primary" disabled={saving}>{saving ? t('저장 중...', 'Saving...') : t('저장', 'Save')}</button></div>
      </form></Modal>}
  </main></>;
}

function formatBytes(value: number) {
  if (value >= 1024 ** 3) return `${Math.round(value / 1024 ** 3)} GB`;
  return `${Math.round(value / 1024 ** 2)} MB`;
}

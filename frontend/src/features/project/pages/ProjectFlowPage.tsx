import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { accessToken, errorMessage } from '../../../api/client';
import { groupApi, MemberResponse } from '../../../api/groupApi';
import { projectApi, ProjectResponse } from '../../../api/projectApi';
import {
  IssueImage, IssueLevel, IssueStatus, ProjectIssue, projectIssueApi,
} from '../../../api/projectIssueApi';
import { AppNavigation, Modal } from '../../../app/AppNavigation';
import { useLanguage } from '../../../app/LanguageContext';
import { ProjectFileSystem } from '../components/ProjectFileSystem';

const statuses: Array<[IssueStatus, string, string]> = [
  ['OPEN', '대기', 'Open'], ['IN_PROGRESS', '진행 중', 'In progress'],
  ['BLOCKED', '막힘', 'Blocked'], ['DONE', '완료', 'Done'],
];
type Editor = { level: IssueLevel; parentId?: number; value?: ProjectIssue };

export function ProjectFlowPage() {
  const { t, language } = useLanguage();
  const projectId = Number(useParams().projectId);
  const [project, setProject] = useState<ProjectResponse>();
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [nodes, setNodes] = useState<ProjectIssue[]>([]);
  const [editor, setEditor] = useState<Editor>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState<IssueStatus>('OPEN');
  const [dueDate, setDueDate] = useState('');
  const [checklistDrafts, setChecklistDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const projectValue = await projectApi.get(projectId);
    const [memberValues, issueValues] = await Promise.all([
      groupApi.members(projectValue.groupId), projectIssueApi.list(projectId, true),
    ]);
    setProject(projectValue); setMembers(memberValues); setNodes(issueValues);
  };
  useEffect(() => {
    if (!Number.isInteger(projectId) || projectId < 1) { setLoading(false); return; }
    load().catch((value) => setError(errorMessage(value))).finally(() => setLoading(false));
  }, [projectId]);

  const children = useMemo(() => {
    const values = new Map<number | undefined, ProjectIssue[]>();
    nodes.filter((node) => !node.archivedAt)
      .forEach((node) => values.set(node.parentId, [...(values.get(node.parentId) ?? []), node]));
    return values;
  }, [nodes]);

  function openCreate(level: IssueLevel, parentId?: number) {
    setEditor({ level, parentId }); setTitle(''); setDescription(''); setAssignee('');
    setStatus('OPEN'); setDueDate(''); setError('');
  }
  function openEdit(value: ProjectIssue) {
    setEditor({ level: value.level, parentId: value.parentId, value }); setTitle(value.title);
    setDescription(value.description ?? ''); setAssignee(value.assigneeMemberId?.toString() ?? '');
    setStatus(value.status); setDueDate(value.dueDate ?? ''); setError('');
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!editor) return; setSaving(true); setError('');
    const input = { title: title.trim(), description: description.trim() || undefined,
      assigneeMemberId: assignee ? Number(assignee) : undefined, dueDate: dueDate || undefined };
    try {
      const saved = editor.value
        ? await projectIssueApi.update(editor.value.id, { ...input, status, sortOrder: editor.value.sortOrder,
          expectedVersion: editor.value.version })
        : await projectIssueApi.create(projectId, { ...input, level: editor.level, parentId: editor.parentId });
      setNodes((current) => editor.value
        ? current.map((node) => node.id === saved.id ? saved : node) : [...current, saved]);
      setEditor(undefined);
    } catch (value) { setError(errorMessage(value)); }
    finally { setSaving(false); }
  }
  async function archive(node: ProjectIssue) {
    const label = node.level === 'ISSUE' ? t('이슈', 'issue') : t('분류와 모든 하위 항목', 'category and all children');
    if (!window.confirm(t(`‘${node.title}’ ${label}을 보관할까요?`, `Archive “${node.title}” ${label}?`))) return;
    try { await projectIssueApi.archive(node.id, node.version); await load(); }
    catch (value) { setError(errorMessage(value)); }
  }
  async function addChecklist(issue: ProjectIssue) {
    const content = checklistDrafts[issue.id]?.trim(); if (!content) return;
    try {
      const item = await projectIssueApi.createChecklist(issue.id, content);
      patchNode(issue.id, (value) => ({ ...value, checklist: [...value.checklist, item] }));
      setChecklistDrafts((current) => ({ ...current, [issue.id]: '' }));
    } catch (value) { setError(errorMessage(value)); }
  }
  async function toggleChecklist(issue: ProjectIssue, itemId: number, completed: boolean) {
    const item = issue.checklist.find((value) => value.id === itemId); if (!item) return;
    try {
      const updated = await projectIssueApi.updateChecklist(item, completed);
      patchNode(issue.id, (value) => ({ ...value,
        checklist: value.checklist.map((current) => current.id === updated.id ? updated : current) }));
    } catch (value) { setError(errorMessage(value)); }
  }
  async function uploadImage(issue: ProjectIssue, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    try {
      const image = await projectIssueApi.uploadImage(issue.id, file);
      patchNode(issue.id, (value) => ({ ...value, images: [...value.images, image] }));
    } catch (value) { setError(errorMessage(value)); }
  }
  async function deleteImage(issue: ProjectIssue, image: IssueImage) {
    if (!window.confirm(t('이 이미지를 삭제할까요?', 'Delete this image?'))) return;
    try {
      await projectIssueApi.deleteImage(image.id);
      patchNode(issue.id, (value) => ({ ...value, images: value.images.filter((item) => item.id !== image.id) }));
    } catch (value) { setError(errorMessage(value)); }
  }
  function patchNode(id: number, change: (value: ProjectIssue) => ProjectIssue) {
    setNodes((current) => current.map((node) => node.id === id ? change(node) : node));
  }

  if (!accessToken.get()) return <Navigate to="/login" replace />;
  if (loading) return <main className="center-page">{t('프로젝트 Flow를 불러오는 중...', 'Loading project flow...')}</main>;
  if (!project) return <Navigate to="/groups" replace />;
  const activeMembers = members.filter((member) => member.status === 'ACTIVE');
  const activeNodes = nodes.filter((node) => !node.archivedAt);
  const archivedNodes = nodes.filter((node) => node.archivedAt);
  const statusLabel = (value: IssueStatus) => {
    const found = statuses.find(([key]) => key === value)!; return language === 'ko' ? found[1] : found[2];
  };
  return <><AppNavigation /><main className="project-flow-page app-page">
    <header className="flow-header"><div><Link to={`/groups/${project.groupId}/projects`}>← {t('프로젝트 목록', 'Projects')}</Link>
      <span className="page-eyebrow">ISSUE FLOW</span><h1>{project.name}</h1>
      <p>{t('대분류에서 실제 작업 이슈와 체크리스트까지 한 흐름으로 관리합니다.', 'Manage categories, actionable issues, and checklists in one flow.')}</p></div>
      {project.canManageFlow && <button className="primary" type="button" onClick={() => openCreate('MAJOR')}>＋ {t('대분류', 'Major category')}</button>}
    </header>
    {error && <p className="error">{error}</p>}
    <section className="flow-overview" aria-label={t('프로젝트 현황', 'Project overview')}>
      <div><span>{t('대분류', 'Major')}</span><strong>{activeNodes.filter((node) => node.level === 'MAJOR').length}</strong></div>
      <div><span>{t('중분류', 'Middle')}</span><strong>{activeNodes.filter((node) => node.level === 'MIDDLE').length}</strong></div>
      <div><span>{t('실행 이슈', 'Issues')}</span><strong>{activeNodes.filter((node) => node.level === 'ISSUE').length}</strong></div>
      <div><span>{t('완료', 'Done')}</span><strong>{activeNodes.filter((node) => node.level === 'ISSUE' && node.status === 'DONE').length}</strong></div>
    </section>
    <ProjectFileSystem project={project} nodes={nodes} />
    {(children.get(undefined) ?? []).length === 0 ? <section className="flow-empty"><h2>{t('첫 대분류를 만들어 주세요', 'Create the first major category')}</h2><p>{t('예: 사용자 관련 개발, 결제 시스템, 운영자 기능', 'Examples: User development, Payments, Admin features')}</p></section>
      : <div className="flow-major-list">{(children.get(undefined) ?? []).map((major) => <section className="flow-major" key={major.id}>
        <header><div><span>{t('대분류', 'MAJOR')}</span><h2>{major.title}</h2>{major.description && <p>{major.description}</p>}</div>
          {major.canManage && <div className="flow-actions"><button className="secondary" onClick={() => openCreate('MIDDLE', major.id)}>＋ {t('중분류', 'Middle')}</button><button className="ghost" onClick={() => openEdit(major)}>{t('수정', 'Edit')}</button><button className="ghost danger-text" onClick={() => archive(major)}>{t('보관', 'Archive')}</button></div>}</header>
        <div className="flow-middle-list">{(children.get(major.id) ?? []).map((middle) => <section className="flow-middle" key={middle.id}>
          <header><div><span>{t('중분류', 'MIDDLE')}</span><h3>{middle.title}</h3></div><div className="flow-actions">
            {project.status !== 'ARCHIVED' && <button className="secondary" onClick={() => openCreate('ISSUE', middle.id)}>＋ {t('소분류 이슈', 'Issue')}</button>}
            {middle.canManage && <><button className="ghost" onClick={() => openEdit(middle)}>{t('수정', 'Edit')}</button><button className="ghost danger-text" onClick={() => archive(middle)}>{t('보관', 'Archive')}</button></>}
          </div></header>
          {(children.get(middle.id) ?? []).length === 0 ? <p className="flow-inline-empty">{t('실행 이슈를 추가해 작업 순서를 만드세요.', 'Add an actionable issue to define the work.')}</p>
            : <div className="flow-issue-grid">{(children.get(middle.id) ?? []).map((issue) => <article className="flow-issue" key={issue.id}>
              <div className="flow-issue-heading"><span className={`issue-status issue-${issue.status.toLowerCase()}`}>{statusLabel(issue.status)}</span><small>#{issue.id}</small></div>
              <h4>{issue.title}</h4><p>{issue.description || t('상세 설명이 없습니다.', 'No description.')}</p>
              <div className="issue-meta"><span>👤 {issue.assigneeNickname ?? t('담당자 미지정', 'Unassigned')}</span><span>📅 {issue.dueDate ?? '—'}</span></div>
              <div className="issue-progress"><span>{t('작업 순서', 'Checklist')}</span><strong>{issue.checklist.filter((item) => item.completed).length}/{issue.checklist.length}</strong></div>
              <div className="issue-checklist">{issue.checklist.map((item) => <label key={item.id}><input type="checkbox" checked={item.completed} disabled={!issue.canManage} onChange={(event) => toggleChecklist(issue, item.id, event.target.checked)} /><span>{item.content}</span></label>)}</div>
              {issue.canManage && <div className="issue-checklist-add"><input value={checklistDrafts[issue.id] ?? ''} maxLength={500} placeholder={t('다음 작업 입력', 'Add next step')} onChange={(event) => setChecklistDrafts((current) => ({ ...current, [issue.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addChecklist(issue); } }} /><button type="button" onClick={() => addChecklist(issue)}>＋</button></div>}
              {issue.images.length > 0 && <div className="issue-images">{issue.images.map((image) => <div key={image.id}><AuthenticatedIssueImage image={image} alt={image.originalFilename} />{image.canDelete && <button type="button" aria-label={t('이미지 삭제', 'Delete image')} onClick={() => deleteImage(issue, image)}>×</button>}</div>)}</div>}
              {issue.canManage && <div className="issue-footer-actions"><label className="secondary file-button">＋ {t('이미지', 'Image')}<input type="file" accept="image/jpeg,image/png,image/gif" onChange={(event) => uploadImage(issue, event)} /></label><button className="ghost" onClick={() => openEdit(issue)}>{t('수정', 'Edit')}</button><button className="ghost danger-text" onClick={() => archive(issue)}>{t('보관', 'Archive')}</button></div>}
            </article>)}</div>}
        </section>)}</div>
      </section>)}</div>}
    {archivedNodes.length > 0 && <details className="archived-projects archived-issues"><summary>{t(`보관된 항목 ${archivedNodes.length}개`, `${archivedNodes.length} archived items`)}</summary>
      <div className="archived-issue-list">{archivedNodes.map((node) => <article key={node.id}><div><strong>{node.title}</strong><small>{node.level} · {node.archivedAt ? new Date(node.archivedAt).toLocaleDateString() : ''}</small></div>
        {node.images.length > 0 && <div className="issue-images">{node.images.map((image) => <div key={image.id}><AuthenticatedIssueImage image={image} alt={image.originalFilename} />{image.canDelete && <button type="button" aria-label={t('이미지 삭제', 'Delete image')} onClick={() => deleteImage(node, image)}>×</button>}</div>)}</div>}</article>)}</div>
      <p>{t('보관된 위치의 파일과 링크는 위 파일 시스템에서 계속 조회하고 정리할 수 있습니다.', 'Files and links in archived locations remain available in the file system above.')}</p>
    </details>}
    {editor && <Modal title={editor.value ? t('항목 수정', 'Edit item') : levelTitle(editor.level, language)} onClose={() => setEditor(undefined)}><form className="form modal-form" onSubmit={save}>
      <label className="field"><span>{t('주제', 'Title')}</span><input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="field"><span>{t('설명', 'Description')}</span><textarea maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      {editor.level === 'ISSUE' && <><label className="field"><span>{t('담당자', 'Assignee')}</span><select value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="">{t('미지정', 'Unassigned')}</option>{activeMembers.map((member) => <option key={member.id} value={member.id}>{member.nickname}</option>)}</select></label>
        {editor.value && <label className="field"><span>{t('상태', 'Status')}</span><select value={status} onChange={(event) => setStatus(event.target.value as IssueStatus)}>{statuses.map(([value, ko, en]) => <option value={value} key={value}>{language === 'ko' ? ko : en}</option>)}</select></label>}
        <label className="field"><span>{t('마감일', 'Due date')}</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></>}
      <div className="modal-actions"><button className="secondary" type="button" onClick={() => setEditor(undefined)}>{t('취소', 'Cancel')}</button><button className="primary" disabled={saving}>{saving ? t('저장 중...', 'Saving...') : t('저장', 'Save')}</button></div>
    </form></Modal>}
  </main></>;
}

function levelTitle(level: IssueLevel, language: 'ko' | 'en') {
  const values = { MAJOR: ['새 대분류', 'New major category'], MIDDLE: ['새 중분류', 'New middle category'], ISSUE: ['새 소분류 이슈', 'New issue'] } as const;
  return values[level][language === 'ko' ? 0 : 1];
}

function AuthenticatedIssueImage({ image, alt }: { image: IssueImage; alt: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true; let objectUrl = '';
    projectIssueApi.imageBlob(image).then(({ blob }) => {
      if (!active) return; objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
    }).catch(() => undefined);
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [image.id]);
  return url ? <img src={url} alt={alt} loading="lazy" /> : <span className="image-placeholder" aria-label={alt} />;
}

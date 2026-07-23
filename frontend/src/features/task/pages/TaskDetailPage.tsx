import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { accessToken, errorMessage } from '../../../api/client';
import { commentApi, CommentResponse } from '../../../api/commentApi';
import { groupApi, GroupResponse, MemberResponse } from '../../../api/groupApi';
import { ChecklistItemResponse, ChecklistResponse, taskApi, TaskAction, TaskHistoryResponse, TaskResponse } from '../../../api/taskApi';
import { AppNavigation, Modal } from '../../../app/AppNavigation';

const statusLabels: Record<TaskResponse['status'], string> = {
  REQUESTED: '승인 대기', TODO: '할 일', IN_PROGRESS: '진행 중', ON_HOLD: '보류',
  COMPLETED: '완료', REJECTED: '반려', CANCELLED: '취소',
};
const priorityLabels: Record<TaskResponse['priority'], string> = {
  LOW: '낮음', NORMAL: '보통', HIGH: '높음', URGENT: '긴급',
};
const actionLabels: Record<TaskAction, string> = {
  ACCEPT: '요청 승인', REJECT: '요청 반려', START: '업무 시작', HOLD: '업무 보류',
  RESUME: '업무 재개', COMPLETE: '업무 완료', CANCEL: '업무 취소',
};

export function TaskDetailPage() {
  const taskId = Number(useParams().taskId);
  const [task, setTask] = useState<TaskResponse>();
  const [group, setGroup] = useState<GroupResponse>();
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [histories, setHistories] = useState<TaskHistoryResponse[]>([]);
  const [checklist, setChecklist] = useState<ChecklistResponse>();
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [newCommentMentionIds, setNewCommentMentionIds] = useState<number[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<number>();
  const [editCommentContent, setEditCommentContent] = useState('');
  const [editCommentMentionIds, setEditCommentMentionIds] = useState<number[]>([]);
  const [newChecklistContent, setNewChecklistContent] = useState('');
  const [assigneeMemberId, setAssigneeMemberId] = useState('');
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TaskResponse['priority']>('NORMAL');
  const [editDueAt, setEditDueAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [reasonAction, setReasonAction] = useState<TaskAction>();
  const [actionReason, setActionReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!Number.isInteger(taskId) || taskId < 1) {
      setError('올바르지 않은 업무 주소입니다.');
      setLoading(false);
      return;
    }
    taskApi.get(taskId).then(async (taskValue) => {
      const [groupValue, memberValues, historyValues, checklistValue, commentValues] = await Promise.all([
        groupApi.get(taskValue.groupId), groupApi.members(taskValue.groupId), taskApi.histories(taskId),
        taskApi.checklist(taskId), commentApi.list(taskId),
      ]);
      setTask(taskValue);
      setGroup(groupValue);
      setMembers(memberValues);
      setHistories(historyValues);
      setChecklist(checklistValue);
      setComments(commentValues);
      setAssigneeMemberId(taskValue.assigneeMemberId?.toString() ?? '');
      syncEditFields(taskValue);
    }).catch((caught) => setError(errorMessage(caught))).finally(() => setLoading(false));
  }, [taskId]);

  async function transition(action: TaskAction) {
    if (!task) return;
    if (action === 'REJECT' || action === 'HOLD' || action === 'CANCEL') {
      setReasonAction(action); setActionReason(''); return;
    }
    await performTransition(action);
  }

  async function performTransition(action: TaskAction, reason?: string) {
    if (!task) return;
    if (reasonAction && !reason?.trim()) { setError('상태 변경 사유를 입력해 주세요.'); return; }
    setPending(true);
    setError('');
    try {
      const updated = await taskApi.transition(task.id, action, task.version, reason?.trim());
      setTask(updated);
      setHistories(await taskApi.histories(task.id));
      setReasonAction(undefined); setActionReason('');
      window.dispatchEvent(new Event('notifications:refresh'));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function assign() {
    if (!task || !assigneeMemberId) return;
    setPending(true);
    setError('');
    try {
      const updated = await taskApi.assign(task.id, Number(assigneeMemberId), task.version);
      setTask(updated);
      window.dispatchEvent(new Event('notifications:refresh'));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function update(event: FormEvent) {
    event.preventDefault();
    if (!task) return;
    setPending(true);
    setError('');
    try {
      const updated = await taskApi.update(task.id, {
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        dueAt: editDueAt || undefined,
        clearDueAt: !editDueAt,
        expectedVersion: task.version,
      });
      setTask(updated);
      syncEditFields(updated);
      setEditing(false);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function refreshChecklist() {
    if (task) setChecklist(await taskApi.checklist(task.id));
  }

  async function addChecklistItem(event: FormEvent) {
    event.preventDefault();
    if (!task || !newChecklistContent.trim()) return;
    setPending(true);
    setError('');
    try {
      await taskApi.createChecklistItem(task.id, newChecklistContent.trim());
      setNewChecklistContent('');
      await refreshChecklist();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function toggleChecklistItem(item: ChecklistItemResponse) {
    setPending(true);
    setError('');
    try {
      await taskApi.updateChecklistItem(item.id, { completed: !item.completed, expectedVersion: item.version });
      await refreshChecklist();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function editChecklistItem(item: ChecklistItemResponse) {
    const content = window.prompt('체크리스트 내용을 수정해 주세요.', item.content);
    if (content === null || content.trim() === item.content) return;
    if (!content.trim()) { setError('체크리스트 내용을 입력해 주세요.'); return; }
    setPending(true);
    setError('');
    try {
      await taskApi.updateChecklistItem(item.id, { content: content.trim(), expectedVersion: item.version });
      await refreshChecklist();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function deleteChecklistItem(item: ChecklistItemResponse) {
    if (!window.confirm(`‘${item.content}’ 항목을 삭제할까요?`)) return;
    setPending(true);
    setError('');
    try {
      await taskApi.deleteChecklistItem(item.id, item.version);
      await refreshChecklist();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function refreshComments() {
    if (task) setComments(await commentApi.list(task.id));
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!task || !newCommentContent.trim()) return;
    setPending(true);
    setError('');
    try {
      await commentApi.create(task.id, newCommentContent.trim(), newCommentMentionIds);
      setNewCommentContent('');
      setNewCommentMentionIds([]);
      await refreshComments();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  function startEditComment(comment: CommentResponse) {
    setEditingCommentId(comment.id);
    setEditCommentContent(comment.content);
    setEditCommentMentionIds(comment.mentions.map((mention) => mention.memberId));
  }

  async function editComment(event: FormEvent, comment: CommentResponse) {
    event.preventDefault();
    if (!editCommentContent.trim()) { setError('댓글 내용을 입력해 주세요.'); return; }
    setPending(true);
    setError('');
    try {
      await commentApi.update(comment.id, editCommentContent.trim(), editCommentMentionIds, comment.version);
      await refreshComments();
      setEditingCommentId(undefined);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  async function deleteComment(comment: CommentResponse) {
    if (!window.confirm('댓글을 삭제할까요? 삭제된 댓글의 원문은 화면에 표시되지 않습니다.')) return;
    setPending(true);
    setError('');
    try {
      await commentApi.delete(comment.id, comment.version);
      await refreshComments();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  function syncEditFields(value: TaskResponse) {
    setEditTitle(value.title);
    setEditDescription(value.description ?? '');
    setEditPriority(value.priority);
    setEditDueAt(value.dueAt?.slice(0, 16) ?? '');
  }

  if (!accessToken.get()) return <Navigate to={`/login?next=${encodeURIComponent(`/tasks/${taskId}`)}`} replace />;
  if (loading) return <main className="center-page">업무를 불러오는 중...</main>;
  return <><AppNavigation /><main className="task-detail-page app-page"><section className="auth-card profile-card task-detail-card">
    <Link to={task ? `/groups/${task.groupId}/tasks` : '/groups'}>← 업무 목록으로</Link>
    {error && <p className="error task-detail-error">{error}</p>}
    {task && <>
      <div className="task-detail-heading"><div className="task-item-top"><span className={`task-status status-${task.status.toLowerCase()}`}>{statusLabels[task.status]}</span><span className={`task-priority priority-${task.priority.toLowerCase()}`}>{priorityLabels[task.priority]}</span>{task.delayed && <span className="task-delayed">지연</span>}</div><h1>{task.title}</h1></div>
      <TaskWorkflow status={task.status} />
      <p className="task-description">{task.description || '등록된 설명이 없습니다.'}</p>
      {canEdit(task, group) && <section className="task-edit-section">{editing ? <form className="form task-edit-form" onSubmit={update}>
        <label className="field"><span>제목</span><input required maxLength={120} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} /></label>
        <label className="field"><span>설명</span><textarea maxLength={5000} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} /></label>
        <div className="task-edit-row"><label className="field"><span>우선순위</span><select value={editPriority} onChange={(event) => setEditPriority(event.target.value as TaskResponse['priority'])}>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="field"><span>마감일</span><input type="datetime-local" value={editDueAt} onChange={(event) => setEditDueAt(event.target.value)} /></label></div>
        <div className="task-edit-actions"><button className="primary" disabled={pending}>수정 저장</button><button className="secondary" type="button" disabled={pending} onClick={() => { syncEditFields(task); setEditing(false); }}>취소</button></div>
      </form> : <button className="secondary" type="button" disabled={pending} onClick={() => setEditing(true)}>업무 내용 수정</button>}</section>}
      <dl className="task-metadata">
        <div><dt>요청자</dt><dd>{memberName(members, task.requesterMemberId)}</dd></div>
        <div><dt>담당자</dt><dd>{task.assigneeMemberId ? memberName(members, task.assigneeMemberId) : '미지정'}</dd></div>
        <div><dt>승인자</dt><dd>{task.approverMemberId ? memberName(members, task.approverMemberId) : '미지정'}</dd></div>
        <div><dt>마감일</dt><dd>{task.dueAt ? formatDate(task.dueAt) : '없음'}</dd></div>
        <div><dt>등록일</dt><dd>{formatDate(task.createdAt)}</dd></div>
        {task.startAt && <div><dt>시작일</dt><dd>{formatDate(task.startAt)}</dd></div>}
        {task.completedAt && <div><dt>완료일</dt><dd>{formatDate(task.completedAt)}</dd></div>}
        {task.holdReason && <div><dt>보류 사유</dt><dd>{task.holdReason}</dd></div>}
        {task.stopReason && <div><dt>종료 사유</dt><dd>{task.stopReason}</dd></div>}
      </dl>
      <div className="task-next-actions"><TaskActions task={task} group={group} pending={pending} onAction={transition} />
        {group?.role === 'LEADER' && task.status !== 'REQUESTED' && !isTerminal(task.status) && <section className="task-action-section"><h2>다음 단계 · 담당자 지정</h2><div className="task-assignee-form"><select value={assigneeMemberId} onChange={(event) => setAssigneeMemberId(event.target.value)}><option value="">담당자 선택</option>{members.map((member) => <option value={member.id} key={member.id}>{member.nickname} · {member.role === 'LEADER' ? '팀장' : '팀원'}</option>)}</select><button className="secondary" type="button" disabled={pending || !assigneeMemberId} onClick={assign}>담당자 저장</button></div></section>}
      </div>
      <ChecklistSection
        checklist={checklist}
        writable={canWriteChecklist(task, group)}
        pending={pending}
        newContent={newChecklistContent}
        onNewContent={setNewChecklistContent}
        onAdd={addChecklistItem}
        onToggle={toggleChecklistItem}
        onEdit={editChecklistItem}
        onDelete={deleteChecklistItem}
      />
      <CommentSection
        comments={comments}
        members={members}
        currentMemberId={group?.memberId}
        pending={pending}
        newContent={newCommentContent}
        newMentionIds={newCommentMentionIds}
        editingCommentId={editingCommentId}
        editContent={editCommentContent}
        editMentionIds={editCommentMentionIds}
        onNewContent={setNewCommentContent}
        onNewMentionIds={setNewCommentMentionIds}
        onAdd={addComment}
        onStartEdit={startEditComment}
        onEdit={editComment}
        onEditContent={setEditCommentContent}
        onEditMentionIds={setEditCommentMentionIds}
        onCancelEdit={() => setEditingCommentId(undefined)}
        onDelete={deleteComment}
      />
      <section className="task-action-section"><h2>상태 이력</h2><div className="task-history-list">{histories.map((history) => <div className="task-history-item" key={history.id}><span className="task-history-dot" /><div><strong>{history.fromStatus ? `${statusLabels[history.fromStatus]} → ` : ''}{statusLabels[history.toStatus]}</strong><small>멤버 #{history.changedByMemberId} · {formatDate(history.createdAt)}</small>{history.reason && <p>{history.reason}</p>}</div></div>)}</div></section>
    </>}
  </section>{reasonAction && <Modal title={actionLabels[reasonAction]} description="업무 이력에 남을 사유를 입력해 주세요." onClose={() => { setReasonAction(undefined); setActionReason(''); setError(''); }}><form className="form modal-form" onSubmit={(event) => { event.preventDefault(); void performTransition(reasonAction, actionReason); }}><label className="field"><span>사유</span><textarea autoFocus required maxLength={500} value={actionReason} onChange={(event) => setActionReason(event.target.value)} placeholder="팀원이 이해할 수 있도록 간단히 적어주세요." /></label>{error && <p className="error">{error}</p>}<div className="modal-actions"><button className="secondary" type="button" onClick={() => setReasonAction(undefined)}>돌아가기</button><button className="danger" disabled={pending || !actionReason.trim()}>{pending ? '처리 중...' : actionLabels[reasonAction]}</button></div></form></Modal>}</main></>;
}

function TaskWorkflow({ status }: { status: TaskResponse['status'] }) {
  const steps: TaskResponse['status'][] = ['REQUESTED', 'TODO', 'IN_PROGRESS', 'COMPLETED'];
  const effective = status === 'ON_HOLD' ? 'IN_PROGRESS' : status;
  const activeIndex = steps.indexOf(effective);
  if (status === 'REJECTED' || status === 'CANCELLED') return <div className="task-workflow stopped"><span>요청</span><span>업무가 {statusLabels[status]}되었습니다</span></div>;
  return <div className="task-workflow">{steps.map((step, index) => <div className={index < activeIndex ? 'done' : index === activeIndex ? 'active' : ''} key={step}><i>{index < activeIndex ? '✓' : index + 1}</i><span>{step === 'REQUESTED' ? '승인 대기' : status === 'ON_HOLD' && step === 'IN_PROGRESS' ? '보류 중' : statusLabels[step]}</span></div>)}</div>;
}

function memberName(members: MemberResponse[], memberId: number) { return members.find((member) => member.id === memberId)?.nickname ?? `멤버 #${memberId}`; }

function CommentSection({ comments, members, currentMemberId, pending, newContent, newMentionIds,
  editingCommentId, editContent, editMentionIds, onNewContent, onNewMentionIds, onAdd,
  onStartEdit, onEdit, onEditContent, onEditMentionIds, onCancelEdit, onDelete }: {
  comments: CommentResponse[];
  members: MemberResponse[];
  currentMemberId?: number;
  pending: boolean;
  newContent: string;
  newMentionIds: number[];
  editingCommentId?: number;
  editContent: string;
  editMentionIds: number[];
  onNewContent: (value: string) => void;
  onNewMentionIds: (value: number[]) => void;
  onAdd: (event: FormEvent) => void;
  onStartEdit: (comment: CommentResponse) => void;
  onEdit: (event: FormEvent, comment: CommentResponse) => void;
  onEditContent: (value: string) => void;
  onEditMentionIds: (value: number[]) => void;
  onCancelEdit: () => void;
  onDelete: (comment: CommentResponse) => void;
}) {
  return <section className="task-action-section task-comments-section">
    <div className="task-section-heading"><h2>댓글</h2><strong>{comments.length}</strong></div>
    {comments.length === 0 ? <p className="task-checklist-empty">아직 댓글이 없습니다.</p> : <div className="task-comment-list">
      {comments.map((comment) => <article className={`task-comment${comment.deleted ? ' deleted' : ''}`} key={comment.id}>
        <header><div><strong>{comment.authorNickname}</strong><small>멤버 #{comment.authorMemberId}</small></div><time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time></header>
        {editingCommentId === comment.id ? <form className="task-comment-edit-form" onSubmit={(event) => onEdit(event, comment)}>
          <textarea required maxLength={2000} value={editContent} onChange={(event) => onEditContent(event.target.value)} />
          <MentionPicker members={members} selectedIds={editMentionIds} onChange={onEditMentionIds} />
          <div><button className="primary" disabled={pending || !editContent.trim()}>수정 저장</button><button className="secondary" type="button" disabled={pending} onClick={onCancelEdit}>취소</button></div>
        </form> : <>
          <p>{comment.content}</p>
          {!comment.deleted && comment.mentions.length > 0 && <div className="task-comment-mentions">{comment.mentions.map((mention) => <span key={mention.id}>@{mention.nickname}</span>)}</div>}
          <footer>{comment.updatedAt && !comment.deleted && <small>수정됨</small>}{comment.authorMemberId === currentMemberId && !comment.deleted && <div><button type="button" disabled={pending} onClick={() => onStartEdit(comment)}>수정</button><button className="danger" type="button" disabled={pending} onClick={() => onDelete(comment)}>삭제</button></div>}</footer>
        </>}
      </article>)}
    </div>}
    <form className="task-comment-form" onSubmit={onAdd}><textarea aria-label="새 댓글 내용" required maxLength={2000} placeholder="댓글을 입력해 주세요." value={newContent} onChange={(event) => onNewContent(event.target.value)} /><MentionPicker members={members} selectedIds={newMentionIds} onChange={onNewMentionIds} /><button className="primary" disabled={pending || !newContent.trim()}>댓글 등록</button></form>
  </section>;
}

function MentionPicker({ members, selectedIds, onChange }: {
  members: MemberResponse[];
  selectedIds: number[];
  onChange: (value: number[]) => void;
}) {
  return <fieldset className="task-mention-picker"><legend>멘션할 멤버 <small>선택 사항</small></legend><div>{members.map((member) => <label key={member.id}><input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => onChange(selectedIds.includes(member.id) ? selectedIds.filter((id) => id !== member.id) : [...selectedIds, member.id])} /><span>@{member.nickname}</span></label>)}</div></fieldset>;
}

function ChecklistSection({ checklist, writable, pending, newContent, onNewContent, onAdd, onToggle, onEdit, onDelete }: {
  checklist?: ChecklistResponse;
  writable: boolean;
  pending: boolean;
  newContent: string;
  onNewContent: (value: string) => void;
  onAdd: (event: FormEvent) => void;
  onToggle: (item: ChecklistItemResponse) => void;
  onEdit: (item: ChecklistItemResponse) => void;
  onDelete: (item: ChecklistItemResponse) => void;
}) {
  return <section className="task-action-section task-checklist-section">
    <div className="task-section-heading"><h2>체크리스트</h2>{checklist && checklist.totalCount > 0 && <strong>{checklist.completedCount}/{checklist.totalCount} · {checklist.progressPercent}%</strong>}</div>
    {!checklist || checklist.totalCount === 0 ? <p className="task-checklist-empty">체크리스트 없음</p> : <>
      <div className="task-progress" aria-label={`체크리스트 진행률 ${checklist.progressPercent}%`}><span style={{ width: `${checklist.progressPercent}%` }} /></div>
      <div className="task-checklist-list">{checklist.items.map((item) => <div className={`task-checklist-item${item.completed ? ' completed' : ''}`} key={item.id}>
        <label><input type="checkbox" checked={item.completed} disabled={!writable || pending} onChange={() => onToggle(item)} /><span>{item.content}</span></label>
        {writable && <div className="task-checklist-actions"><button type="button" disabled={pending} onClick={() => onEdit(item)}>수정</button><button className="danger" type="button" disabled={pending} onClick={() => onDelete(item)}>삭제</button></div>}
      </div>)}</div>
    </>}
    {writable ? <form className="task-checklist-form" onSubmit={onAdd}><input aria-label="새 체크리스트 내용" maxLength={300} placeholder="새 체크리스트 항목" value={newContent} onChange={(event) => onNewContent(event.target.value)} /><button className="secondary" disabled={pending || !newContent.trim()}>추가</button></form> : <small className="task-checklist-readonly">담당자 또는 팀장만 변경할 수 있습니다.</small>}
  </section>;
}

function TaskActions({ task, group, pending, onAction }: {
  task: TaskResponse; group?: GroupResponse; pending: boolean; onAction: (action: TaskAction) => void;
}) {
  if (!group || isTerminal(task.status)) return null;
  const leader = group.role === 'LEADER';
  const assignee = task.assigneeMemberId === group.memberId;
  const requester = task.requesterMemberId === group.memberId;
  const actions: TaskAction[] = [];
  if (task.status === 'REQUESTED' && leader) actions.push('ACCEPT', 'REJECT');
  if (task.status === 'TODO' && assignee) actions.push('START');
  if (task.status === 'IN_PROGRESS' && assignee) actions.push('HOLD', 'COMPLETE');
  if (task.status === 'ON_HOLD' && assignee) actions.push('RESUME');
  if (leader || (requester && task.status === 'REQUESTED')) actions.push('CANCEL');
  if (actions.length === 0) return null;
  return <section className="task-action-section"><h2>상태 변경</h2><div className="task-action-buttons">{actions.map((action) => <button className={action === 'REJECT' || action === 'CANCEL' ? 'task-danger-action' : 'secondary'} type="button" disabled={pending} onClick={() => onAction(action)} key={action}>{actionLabels[action]}</button>)}</div></section>;
}

function isTerminal(status: TaskResponse['status']) {
  return status === 'COMPLETED' || status === 'REJECTED' || status === 'CANCELLED';
}

function canEdit(task: TaskResponse, group?: GroupResponse) {
  if (!group || isTerminal(task.status)) return false;
  if (group.type === 'PERSONAL') return true;
  return task.status === 'REQUESTED'
    && (group.role === 'LEADER' || task.requesterMemberId === group.memberId);
}

function canWriteChecklist(task: TaskResponse, group?: GroupResponse) {
  return Boolean(group && !isTerminal(task.status)
    && (group.role === 'LEADER' || task.assigneeMemberId === group.memberId));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

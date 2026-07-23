import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { accessToken, errorMessage } from '../../../api/client';
import { groupApi, GroupResponse } from '../../../api/groupApi';
import { taskApi, TaskPriority, TaskResponse } from '../../../api/taskApi';
import { AppNavigation, Modal } from '../../../app/AppNavigation';

const statusLabels: Record<TaskResponse['status'], string> = {
  REQUESTED: '승인 대기', TODO: '할 일', IN_PROGRESS: '진행 중', ON_HOLD: '보류',
  COMPLETED: '완료', REJECTED: '반려', CANCELLED: '취소',
};
const priorityLabels: Record<TaskPriority, string> = {
  LOW: '낮음', NORMAL: '보통', HIGH: '높음', URGENT: '긴급',
};

export function TasksPage() {
  const groupId = Number(useParams().groupId);
  const [group, setGroup] = useState<GroupResponse>();
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [dueAt, setDueAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(groupId) || groupId < 1) {
      setError('올바르지 않은 그룹 주소입니다.');
      setLoading(false);
      return;
    }
    Promise.all([groupApi.get(groupId), taskApi.list(groupId)])
      .then(([groupValue, taskValues]) => { setGroup(groupValue); setTasks(taskValues); })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoading(false));
  }, [groupId]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await taskApi.create(groupId, {
        title, description: description || undefined, priority, dueAt: dueAt || undefined,
      });
      setTasks((current) => [created, ...current]);
      setTitle('');
      setDescription('');
      setPriority('NORMAL');
      setDueAt('');
      setShowCreate(false);
      window.dispatchEvent(new Event('notifications:refresh'));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  if (!accessToken.get()) return <Navigate to={`/login?next=${encodeURIComponent(`/groups/${groupId}/tasks`)}`} replace />;
  if (loading) return <main className="center-page">업무를 불러오는 중...</main>;
  const sortedTasks = [...tasks].sort((left, right) => {
    if (left.dueAt && right.dueAt) return left.dueAt.localeCompare(right.dueAt);
    if (left.dueAt) return -1; if (right.dueAt) return 1;
    return right.createdAt.localeCompare(left.createdAt);
  });
  return <><AppNavigation /><main className="tasks-page app-page">
    <header className="tasks-header">
      <div><Link to={`/groups/${groupId}`}>← 그룹으로</Link><h1>{group?.name ?? '그룹'} 업무</h1><p>{group?.type === 'PERSONAL' ? '등록 즉시 할 일로 시작합니다.' : '새 업무는 승인 대기 상태로 시작합니다.'}</p></div>
      <button className="primary create-action" type="button" onClick={() => setShowCreate(true)}><span aria-hidden="true">＋</span> 업무 만들기</button>
    </header>
    {error && <p className="error tasks-error">{error}</p>}
    <section className="tasks-layout tasks-layout-single">
      <section className="task-list-card">
        <h2>업무 목록 <small>{tasks.length}</small></h2>
        {tasks.length === 0 && <p className="empty-state">첫 업무를 등록해 보세요.</p>}
        <div className="task-list">{sortedTasks.map((task) => <Link className="task-item" to={`/tasks/${task.id}`} key={task.id}>
          <div className="task-item-top"><span className={`task-status status-${task.status.toLowerCase()}`}>{statusLabels[task.status]}</span><span className={`task-priority priority-${task.priority.toLowerCase()}`}>{priorityLabels[task.priority]}</span>{task.delayed && <span className="task-delayed">지연</span>}</div>
          <strong>{task.title}</strong>
          <p>{task.description || '설명 없음'}</p>
          <div className="task-date-row"><span><b>등록</b>{formatDate(task.createdAt)}</span><span className={task.delayed ? 'overdue' : ''}><b>마감</b>{task.dueAt ? formatDate(task.dueAt) : '미정'}</span></div>
          <small>업무 상세 보기 →</small>
        </Link>)}</div>
      </section>
      {showCreate && <Modal title="새 업무 만들기" description={`${group?.name ?? '그룹'}에 새로운 업무를 추가합니다.`} onClose={() => setShowCreate(false)}><form className="form modal-form" onSubmit={create}>
        <label className="field"><span>제목</span><input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 발표 자료 초안 작성" /></label>
        <label className="field"><span>설명 (선택)</span><textarea maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label className="field"><span>우선순위</span><select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label className="field"><span>마감 날짜·시간 (선택)</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /><small className="field-help">시간이 필요한 업무는 시각까지 지정할 수 있습니다.</small></label>
        <div className="modal-actions"><button className="secondary" type="button" onClick={() => setShowCreate(false)}>취소</button><button className="primary" disabled={saving}>{saving ? '등록 중...' : '업무 만들기'}</button></div>
      </form></Modal>}
    </section>
  </main></>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

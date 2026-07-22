import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { accessToken, errorMessage } from '../../../api/client';
import { dashboardApi, GroupDashboard } from '../../../api/dashboardApi';

const statusLabels: Record<string, string> = { requested: '승인 대기', todo: '할 일', inProgress: '진행 중', onHold: '보류', completed: '완료', rejected: '반려', cancelled: '취소', delayed: '지연' };

export function GroupDashboardPage() {
  const groupId = Number(useParams().groupId);
  const defaults = defaultRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [dashboard, setDashboard] = useState<GroupDashboard>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function load() {
    setLoading(true); setError('');
    try { setDashboard(await dashboardApi.group(groupId, from, to)); }
    catch (value) { setError(errorMessage(value)); }
    finally { setLoading(false); }
  }
  if (!accessToken.get()) return <Navigate to="/login" replace />;
  return <main className="group-dashboard-page">
    <header className="dashboard-header"><div><Link to={`/groups/${groupId}`}>← 그룹으로</Link><h1>{dashboard?.groupName ?? '그룹'} 대시보드</h1><p>{dashboard?.timezone ?? '집계 정보를 불러오는 중입니다.'}</p></div><Link to={`/groups/${groupId}/tasks`}>업무 목록</Link></header>
    <section className="dashboard-period"><label>시작일 <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>종료일 <input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><button className="secondary" type="button" onClick={load}>적용</button><small>종료일은 집계에 포함하지 않습니다.</small></section>
    {error && <p className="error">{error}</p>}{loading && <p className="muted">대시보드를 불러오는 중...</p>}
    {dashboard && <>
      <section className="dashboard-stat-grid"><Stat label="전체 업무" value={dashboard.totalCount} /><Stat label="흐름 진행률" value={rate(dashboard.workflowProgressPercent)} /><Stat label="기간 완료율" value={rate(dashboard.periodCompletionRatePercent)} detail={`${dashboard.periodCompletedCount}/${dashboard.periodCreatedCount}건`} /><Stat label="기한 준수율" value={rate(dashboard.onTimeRatePercent)} detail={`${dashboard.onTimeCompletedCount}/${dashboard.completedWithDueDateCount}건`} /><Stat label="평균 완료 시간" value={dashboard.averageCompletionHours == null ? '-' : `${dashboard.averageCompletionHours}시간`} /></section>
      <section className="dashboard-panel"><h2>현재 상태</h2><div className="status-metric-grid">{Object.entries(dashboard.statuses).map(([key, value]) => <div className={key === 'delayed' ? 'risk' : ''} key={key}><span>{statusLabels[key]}</span><strong>{value}</strong></div>)}</div></section>
      <section className="dashboard-two-columns"><section className="dashboard-panel"><h2>팀원별 담당 현황</h2><div className="member-metrics">{dashboard.members.map((member) => <article key={member.memberId}><div><strong>{member.nickname}</strong><small>{member.role === 'LEADER' ? '팀장' : '팀원'}</small></div><dl><div><dt>담당</dt><dd>{member.assignedCount}</dd></div><div><dt>진행</dt><dd>{member.activeCount}</dd></div><div><dt>완료</dt><dd>{member.completedCount}</dd></div><div><dt>지연</dt><dd>{member.delayedCount}</dd></div><div><dt>기한 준수</dt><dd>{rate(member.onTimeRatePercent)}</dd></div></dl></article>)}</div></section>
        <section className="dashboard-panel"><h2>위험·우선 확인 업무</h2>{dashboard.riskTasks.length === 0 ? <p className="empty-state">현재 위험 업무가 없습니다.</p> : <div className="dashboard-task-list">{dashboard.riskTasks.map((task) => <TaskLink task={task} key={task.id} />)}</div>}</section></section>
      <p className="metric-note">기간 완료율 = 기간 생성 업무 중 현재 완료된 업무 비율 · 흐름 진행률 = 요청 0, 할 일 25, 진행/보류 50, 완료 100의 평균(반려·취소 제외)</p>
    </>}
  </main>;
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) { return <article><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>; }
function TaskLink({ task }: { task: GroupDashboard['riskTasks'][number] }) { return <Link to={`/tasks/${task.id}`}><div><strong>{task.title}</strong>{task.delayed && <span>지연</span>}</div><small>{task.groupName} · {task.priority} · {task.dueAt?.slice(0, 16) ?? '마감 없음'}</small></Link>; }
function rate(value?: number) { return value == null ? '-' : `${value}%`; }
function defaultRange() { const to = new Date(); to.setDate(to.getDate() + 1); const from = new Date(); from.setDate(from.getDate() - 29); return { from: dateText(from), to: dateText(to) }; }
function dateText(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { accessToken, errorMessage } from '../../../api/client';
import { dashboardApi, DashboardTask, GroupDashboard } from '../../../api/dashboardApi';
import { taskApi, TaskPriority } from '../../../api/taskApi';
import { AppNavigation, Modal } from '../../../app/AppNavigation';
import { groupApi, GroupResponse } from '../../../api/groupApi';

const statusLabels: Record<string, string> = { requested: '승인 대기', todo: '할 일', inProgress: '진행 중', onHold: '보류', completed: '완료', rejected: '반려', cancelled: '취소', delayed: '지연' };
const taskStatusLabels: Record<string, string> = { REQUESTED: '승인 대기', TODO: '할 일', IN_PROGRESS: '진행 중', ON_HOLD: '보류', COMPLETED: '완료', REJECTED: '반려', CANCELLED: '취소' };
const priorityLabels: Record<TaskPriority, string> = { LOW: '낮음', NORMAL: '보통', HIGH: '높음', URGENT: '긴급' };
type ReportScope = 'GROUP' | 'MY';
type ReportPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export function GroupDashboardPage() {
  const groupId = Number(useParams().groupId);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [week, setWeek] = useState(0);
  const [dashboard, setDashboard] = useState<GroupDashboard>();
  const [group, setGroup] = useState<GroupResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [reportScope, setReportScope] = useState<ReportScope>('MY');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('WEEKLY');
  const [reportPending, setReportPending] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const range = useMemo(() => periodRange(year, month, week), [year, month, week]);
  const periodLabel = `${year}년 ${month}월${week ? ` ${week}주차` : ''}`;

  useEffect(() => {
    groupApi.get(groupId).then((value) => {
      setGroup(value);
      setReportScope(value.role === 'LEADER' ? 'GROUP' : 'MY');
    }).catch((value) => setError(errorMessage(value)));
  }, [groupId]);
  useEffect(() => { load(); }, [groupId, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps
  async function load() {
    setLoading(true); setError('');
    try { setDashboard(await dashboardApi.group(groupId, range.from, range.to)); }
    catch (value) { setError(errorMessage(value)); }
    finally { setLoading(false); }
  }
  async function createTask(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setCreateError('');
    try {
      await taskApi.create(groupId, { title: title.trim(), description: description.trim() || undefined, priority, dueAt: dueAt || undefined });
      setTitle(''); setDescription(''); setPriority('NORMAL'); setDueAt(''); setShowCreate(false);
      window.dispatchEvent(new Event('notifications:refresh'));
      const current = new Date();
      const periodChanged = year !== current.getFullYear() || month !== current.getMonth() + 1 || week !== 0;
      setYear(current.getFullYear()); setMonth(current.getMonth() + 1); setWeek(0);
      if (!periodChanged) await load();
    } catch (value) { setCreateError(errorMessage(value)); }
    finally { setSaving(false); }
  }
  async function downloadReport(scope: ReportScope = reportScope, period: ReportPeriod = reportPeriod) {
    const reportWindow = window.open('', '_blank', 'width=900,height=760');
    if (!reportWindow) {
      setReportMessage('PDF 리포트를 열려면 브라우저의 팝업을 허용해 주세요.');
      return;
    }
    reportWindow.document.write('<p style="font-family:sans-serif;padding:32px">리포트를 생성하고 있습니다...</p>');
    setReportPending(true);
    setReportMessage('');
    try {
      const reportRangeValue = reportRange(year, month, week, period);
      const reportDashboard = scope === 'GROUP'
        ? await dashboardApi.group(groupId, reportRangeValue.from, reportRangeValue.to)
        : undefined;
      const memberReport = scope === 'MY'
        ? await dashboardApi.memberReport(groupId, reportRangeValue.from, reportRangeValue.to)
        : undefined;
      const access = await groupApi.authorizeReport(groupId, scope, period);
      const tasks = memberReport?.tasks ?? reportDashboard?.periodTasks ?? [];
      printReport(memberReport?.groupName ?? reportDashboard?.groupName ?? group?.name ?? '그룹',
        reportRangeValue.label, tasks, scope, period, reportWindow);
      if (access.remainingThisWeek !== undefined) {
        setReportMessage(`이번 주 그룹 리포트를 ${access.remainingThisWeek}회 더 생성할 수 있습니다.`);
      }
    } catch (value) {
      reportWindow.close();
      setReportMessage(errorMessage(value));
    } finally {
      setReportPending(false);
    }
  }
  if (!accessToken.get()) return <Navigate to="/login" replace />;
  const years = Array.from({ length: 5 }, (_, index) => today.getFullYear() - 3 + index);
  return <><AppNavigation /><main className="group-dashboard-page app-page">
    <header className="dashboard-header"><div><Link to="/groups">← 내 그룹</Link><h1>{dashboard?.groupName ?? '그룹'} 대시보드</h1><p>{periodLabel}의 업무와 일정을 모아봤어요.</p></div><div className="group-dashboard-actions"><button className="primary create-action" type="button" onClick={() => setShowCreate(true)}><span aria-hidden="true">＋</span> 새 업무</button><Link className="secondary" to={`/groups/${groupId}/tasks`}>업무 목록</Link><Link className="settings-icon-button" to={`/groups/${groupId}`} aria-label="그룹 설정">⚙</Link></div></header>
    <section className="dashboard-period dashboard-period-selectors"><div><label><span>연도</span><select value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((value) => <option value={value} key={value}>{value}년</option>)}</select></label><label><span>월</span><select value={month} onChange={(event) => { setMonth(Number(event.target.value)); setWeek(0); }}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option value={value} key={value}>{value}월</option>)}</select></label><label><span>주차</span><select value={week} onChange={(event) => setWeek(Number(event.target.value))}><option value={0}>월 전체</option>{availableWeeks(year, month).map((value) => <option value={value} key={value}>{value}주차</option>)}</select></label></div><div><button className="secondary" type="button" onClick={() => shiftMonth(year, month, -1, setYear, setMonth, setWeek)}>‹ 이전 달</button><button className="secondary" type="button" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); setWeek(0); }}>이번 달</button></div></section>
    {error && <p className="error">{error}</p>}{loading && <p className="muted">대시보드를 불러오는 중...</p>}
    {!loading && !dashboard && group && <section className="dashboard-panel weekly-report-preview"><div className="dashboard-panel-title"><div><span className="page-eyebrow">MY REPORT</span><h2>내 업무 리포트</h2><p>그룹 전체 대시보드 공개 여부와 관계없이 본인 담당 업무를 확인할 수 있습니다.</p></div></div><div className="report-controls"><label><span>기간</span><select value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value as ReportPeriod)}><option value="WEEKLY">주간</option><option value="MONTHLY">월간</option><option value="YEARLY">연간</option></select></label><button className="report-download" type="button" disabled={reportPending} onClick={() => downloadReport('MY', reportPeriod)}>{reportPending ? '생성 중...' : '내 PDF 리포트 생성'}</button></div>{reportMessage && <p className="error">{reportMessage}</p>}</section>}
    {dashboard && <>
      <section className="dashboard-stat-grid"><Stat label="기간 업무" value={dashboard.periodTasks.length} /><Stat label="흐름 진행률" value={rate(dashboard.workflowProgressPercent)} /><Stat label="기간 완료율" value={rate(dashboard.periodCompletionRatePercent)} detail={`${dashboard.periodCompletedCount}/${dashboard.periodCreatedCount}건`} /><Stat label="기한 준수율" value={rate(dashboard.onTimeRatePercent)} detail={`${dashboard.onTimeCompletedCount}/${dashboard.completedWithDueDateCount}건`} /><Stat label="평균 완료 시간" value={dashboard.averageCompletionHours == null ? '-' : `${dashboard.averageCompletionHours}시간`} /></section>
      <section className="dashboard-panel"><div className="dashboard-panel-title"><div><h2>{periodLabel} 상태</h2><p>승인 대기는 전체 미처리 건, 나머지는 선택 기간 기준입니다.</p></div></div><div className="status-metric-grid">{Object.entries(dashboard.statuses).map(([key, value]) => <div className={key === 'delayed' ? 'risk' : ''} key={key}><span>{statusLabels[key]}</span><strong>{value}</strong></div>)}</div></section>
      <section className="dashboard-two-columns"><section className="dashboard-panel"><h2>기간 업무</h2>{dashboard.periodTasks.length === 0 ? <p className="empty-state">이 기간에 연결된 업무가 없습니다.</p> : <div className="dashboard-task-list period-task-list">{dashboard.periodTasks.map((task) => <TaskLink task={task} key={task.id} />)}</div>}</section>
        <section className="dashboard-panel"><div className="dashboard-panel-title inline"><div><h2>그룹 전체 일정</h2><p>내 담당 여부와 관계없이 그룹 일정을 보여줍니다.</p></div><Link to={`/calendar?groupId=${groupId}`}>캘린더 열기 →</Link></div>{dashboard.calendarItems.length === 0 ? <p className="empty-state">이 기간에 등록된 일정이 없습니다.</p> : <div className="group-calendar-preview">{dashboard.calendarItems.slice(0, 8).map((item) => <Link to={item.sourceTaskId ? `/tasks/${item.sourceTaskId}` : `/calendar?groupId=${groupId}`} key={`${item.source}-${item.eventId ?? item.sourceTaskId}`}><time>{item.startAt.slice(5, 10)}<small>{item.allDay ? '종일' : item.startAt.slice(11, 16)}</small></time><span><strong>{item.title}</strong><small>{item.ownerNickname ?? item.groupName}</small></span></Link>)}</div>}</section></section>
      <section className="dashboard-two-columns"><section className="dashboard-panel"><h2>팀원별 담당 현황</h2><div className="member-metrics">{dashboard.members.map((member) => <article key={member.memberId}><div><strong>{member.nickname}</strong><small>{member.role === 'LEADER' ? '팀장' : '팀원'}</small></div><dl><div><dt>담당</dt><dd>{member.assignedCount}</dd></div><div><dt>진행</dt><dd>{member.activeCount}</dd></div><div><dt>완료</dt><dd>{member.completedCount}</dd></div><div><dt>지연</dt><dd>{member.delayedCount}</dd></div><div><dt>기한 준수</dt><dd>{rate(member.onTimeRatePercent)}</dd></div></dl></article>)}</div></section>
        <section className="dashboard-panel"><h2>위험·우선 확인 업무</h2>{dashboard.riskTasks.length === 0 ? <p className="empty-state">선택 기간에 위험 업무가 없습니다.</p> : <div className="dashboard-task-list">{dashboard.riskTasks.map((task) => <TaskLink task={task} key={task.id} />)}</div>}</section></section>
      <section className="dashboard-panel weekly-report-preview"><div className="dashboard-panel-title inline"><div><span className="page-eyebrow">REPORTS</span><h2>업무 리포트</h2><p>저장된 업무 데이터로 AI 없이 리포트를 생성합니다.</p></div><span className={`membership-badge ${group?.membershipPlan.toLowerCase() ?? 'free'}`}>{group?.membershipPlan === 'PAID' ? '유료 그룹' : '무료 그룹'}</span></div><div className="report-controls"><label><span>범위</span><select value={reportScope} onChange={(event) => setReportScope(event.target.value as ReportScope)}><option value="MY">내 업무</option>{group?.role === 'LEADER' && <option value="GROUP">그룹 전체</option>}</select></label><label><span>기간</span><select value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value as ReportPeriod)}><option value="WEEKLY">주간</option><option value="MONTHLY">월간</option><option value="YEARLY">연간</option></select></label><button className="report-download" type="button" disabled={reportPending || !group} onClick={() => downloadReport()}>{reportPending ? '생성 중...' : 'PDF 리포트 생성'}</button></div>{group?.membershipPlan === 'FREE' && reportScope === 'GROUP' && <p className="report-policy">무료 그룹의 전체 리포트는 주 2회까지 생성할 수 있습니다. 내 업무 리포트는 제한 없이 제공됩니다.</p>}{group?.membershipPlan === 'PAID' && <p className="report-policy">유료 AI 리포트와 월 1회 자동 PDF 메일 발송은 추후 연결 예정입니다.</p>}{reportMessage && <p className={reportMessage.includes('더 생성') ? 'success-message' : 'error'}>{reportMessage}</p>}<ReportSummary dashboard={dashboard} /></section>
    </>}
    {showCreate && <Modal title="새 업무 만들기" description={`${dashboard?.groupName ?? '그룹'} 대시보드에서 바로 업무를 추가합니다.`} onClose={() => !saving && setShowCreate(false)}><form className="form modal-form" onSubmit={createTask}>
      <label className="field"><span>제목</span><input autoFocus required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 발표 자료 초안 작성" /></label>
      <label className="field"><span>설명 (선택)</span><textarea maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <label className="field"><span>우선순위</span><select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>{Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="field"><span>마감 날짜·시간 (선택)</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /><small className="field-help">시간이 필요한 업무는 시각까지 지정할 수 있습니다.</small></label>
      {createError && <p className="error">{createError}</p>}
      <div className="modal-actions"><button className="secondary" type="button" disabled={saving} onClick={() => setShowCreate(false)}>취소</button><button className="primary" disabled={saving || !title.trim()}>{saving ? '등록 중...' : '업무 만들기'}</button></div>
    </form></Modal>}
  </main></>;
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail?: string }) { return <article><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article>; }
function TaskLink({ task }: { task: DashboardTask }) { return <Link to={`/tasks/${task.id}`}><div><strong>{task.title}</strong>{task.delayed && <span>지연</span>}</div><small>{taskStatusLabels[task.status] ?? task.status} · {task.assigneeNickname ?? '담당자 미지정'} · {task.dueAt?.slice(0, 16) ?? '마감 없음'}</small></Link>; }
function ReportSummary({ dashboard }: { dashboard: GroupDashboard }) { return <div className="report-summary-grid"><div><span>완료한 업무</span><strong>{dashboard.statuses.completed}건</strong></div><div><span>진행·보류</span><strong>{dashboard.statuses.inProgress + dashboard.statuses.onHold}건</strong></div><div><span>새로 등록</span><strong>{dashboard.periodCreatedCount}건</strong></div><div><span>지연 업무</span><strong>{dashboard.statuses.delayed}건</strong></div></div>; }
function rate(value?: number) { return value == null ? '-' : `${value}%`; }
function dateText(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
function availableWeeks(year: number, month: number) { return Array.from({ length: Math.ceil(new Date(year, month, 0).getDate() / 7) }, (_, index) => index + 1); }
function periodRange(year: number, month: number, week: number) { const startDay = week ? (week - 1) * 7 + 1 : 1; const endDay = week ? Math.min(week * 7 + 1, new Date(year, month, 0).getDate() + 1) : 1; const from = new Date(year, month - 1, startDay); const to = week ? new Date(year, month - 1, endDay) : new Date(year, month, 1); return { from: dateText(from), to: dateText(to) }; }
function shiftMonth(year: number, month: number, amount: number, setYear: (value: number) => void, setMonth: (value: number) => void, setWeek: (value: number) => void) { const value = new Date(year, month - 1 + amount, 1); setYear(value.getFullYear()); setMonth(value.getMonth() + 1); setWeek(0); }
function reportRange(year: number, month: number, week: number, period: ReportPeriod) {
  if (period === 'YEARLY') return { from: `${year}-01-01`, to: `${year + 1}-01-01`, label: `${year}년 연간` };
  if (period === 'MONTHLY') return { ...periodRange(year, month, 0), label: `${year}년 ${month}월` };
  const current = new Date();
  const selectedWeek = week || (current.getFullYear() === year && current.getMonth() + 1 === month
    ? Math.ceil(current.getDate() / 7) : 1);
  return { ...periodRange(year, month, selectedWeek), label: `${year}년 ${month}월 ${selectedWeek}주차` };
}
function printReport(groupName: string, label: string, tasks: DashboardTask[], scope: ReportScope, period: ReportPeriod, report: Window) {
  const rows = tasks.map((task) => `<tr><td>${escapeHtml(task.title)}</td><td>${taskStatusLabels[task.status] ?? task.status}</td><td>${escapeHtml(task.assigneeNickname ?? '미지정')}</td><td>${task.dueAt?.slice(0, 16) ?? '-'}</td></tr>`).join('');
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
  const active = tasks.filter((task) => task.status === 'IN_PROGRESS' || task.status === 'ON_HOLD').length;
  const delayed = tasks.filter((task) => task.delayed).length;
  const periodName = { WEEKLY: '주간', MONTHLY: '월간', YEARLY: '연간' }[period];
  report.document.open();
  report.document.write(`<!doctype html><html lang="ko"><head><title>${escapeHtml(groupName)} ${label} 리포트</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Noto Sans KR",sans-serif;color:#25232c;padding:42px}h1{margin-bottom:5px}p{color:#666}section{margin:28px 0}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.stats div{padding:16px;border:1px solid #ddd;border-radius:10px}.stats strong{display:block;font-size:24px;margin-top:6px}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left;font-size:13px}.note{margin-top:32px;padding:16px;background:#f5f4fa;border-radius:10px}@media print{body{padding:12px}.no-print{display:none}}</style></head><body><h1>${escapeHtml(groupName)} ${scope === 'MY' ? '내 업무 ' : ''}${periodName} 리포트</h1><p>${label} · 생성 ${new Date().toLocaleString('ko-KR')}</p><section class="stats"><div>기간 업무<strong>${tasks.length}</strong></div><div>완료<strong>${completed}</strong></div><div>진행·보류<strong>${active}</strong></div><div>지연<strong>${delayed}</strong></div></section><section><h2>업무 목록</h2><table><thead><tr><th>업무</th><th>상태</th><th>담당자</th><th>마감</th></tr></thead><tbody>${rows || '<tr><td colspan="4">해당 기간의 업무가 없습니다.</td></tr>'}</tbody></table></section><p class="note">현재 리포트는 저장된 업무 데이터로 작성되었으며 OpenAI API를 사용하지 않습니다.</p><button class="no-print" onclick="window.print()">PDF로 저장 / 인쇄</button></body></html>`); report.document.close(); report.focus(); setTimeout(() => report.print(), 300);
}
function escapeHtml(value: string) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character); }

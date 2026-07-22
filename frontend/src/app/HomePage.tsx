import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authApi, MeResponse } from '../api/authApi';
import { accessToken } from '../api/client';
import { notificationApi } from '../api/notificationApi';
import { dashboardApi, DashboardTask, PersonalDashboard } from '../api/dashboardApi';

export function HomePage() {
  const navigate = useNavigate();
  const [me, setMe] = useState<MeResponse>();
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dashboard, setDashboard] = useState<PersonalDashboard>();
  useEffect(() => {
    async function load() {
      try {
        if (!accessToken.get()) {
          const token = await authApi.refresh();
          accessToken.set(token.accessToken);
        }
        setMe(await authApi.me());
        setDashboard(await dashboardApi.personal());
        notificationApi.list(1).then((page) => setUnreadCount(page.unreadCount)).catch(() => undefined);
      } catch { accessToken.clear(); }
      finally { setLoading(false); }
    }
    load();
  }, []);
  useEffect(() => {
    if (!me) return;
    const interval = window.setInterval(() => notificationApi.list(1)
      .then((page) => setUnreadCount(page.unreadCount)).catch(() => undefined), 30_000);
    return () => window.clearInterval(interval);
  }, [me]);
  async function logout() {
    await authApi.logout().catch(() => undefined);
    accessToken.clear();
    navigate('/login');
  }
  if (loading) return <main className="center-page">인증 상태 확인 중...</main>;
  if (!me) return <Navigate to="/login" replace />;
  return <main className="personal-dashboard-page"><header className="personal-dashboard-header"><div><span className="brand-mark">T</span><div><h1>{me.name}님의 대시보드</h1><p>참여 중인 모든 그룹의 내 업무를 모았습니다.</p></div></div><nav className="home-actions" aria-label="주요 메뉴"><Link className="primary" to="/groups">내 그룹</Link><Link to="/calendar">캘린더</Link><Link className="notification-link" to="/notifications">알림{unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}</Link><Link to="/profile">프로필</Link><button className="secondary" type="button" onClick={logout}>로그아웃</button></nav></header>
    {dashboard && <><section className="dashboard-stat-grid personal-stats"><Summary label="오늘 마감" value={dashboard.todayDueCount} /><Summary label="지연" value={dashboard.delayedCount} risk /><Summary label="진행 중" value={dashboard.inProgressCount} /><Summary label="읽지 않은 알림" value={dashboard.unreadNotificationCount} /></section>
      <section className="dashboard-two-columns"><section className="dashboard-panel"><h2>내 우선 업무</h2>{dashboard.priorityTasks.length === 0 ? <p className="empty-state">진행할 담당 업무가 없습니다.</p> : <div className="dashboard-task-list">{dashboard.priorityTasks.map((task) => <PersonalTask task={task} key={task.id} />)}</div>}</section><section className="dashboard-panel"><h2>다가오는 일정</h2>{dashboard.upcomingItems.length === 0 ? <p className="empty-state">7일 안에 예정된 일정이 없습니다.</p> : <div className="upcoming-list">{dashboard.upcomingItems.map((item) => <Link to={item.sourceTaskId ? `/tasks/${item.sourceTaskId}` : '/calendar'} key={`${item.source}-${item.eventId ?? item.sourceTaskId}`}><strong>{item.title}</strong><span>{item.startAt.slice(0, 16)} · {item.groupName}</span></Link>)}</div>}</section></section>
      <section className="dashboard-two-columns"><section className="dashboard-panel"><h2>그룹별 내 업무</h2><div className="personal-group-metrics">{dashboard.groups.map((group) => <Link to={`/groups/${group.groupId}/dashboard`} key={group.groupId}><strong>{group.groupName}</strong><span>담당 {group.assignedCount} · 진행 {group.activeCount} · 완료 {group.completedCount} · 지연 {group.delayedCount}</span></Link>)}</div></section><section className="dashboard-panel"><h2>최근 알림</h2>{dashboard.recentNotifications.length === 0 ? <p className="empty-state">최근 알림이 없습니다.</p> : <div className="recent-dashboard-notifications">{dashboard.recentNotifications.map((item) => <Link to="/notifications" key={item.id}><strong>{item.title}</strong><span>{item.message}</span></Link>)}</div>}</section></section>
    </>}
  </main>;
}

function Summary({ label, value, risk = false }: { label: string; value: number; risk?: boolean }) { return <article className={risk && value > 0 ? 'risk' : ''}><span>{label}</span><strong>{value}</strong></article>; }
function PersonalTask({ task }: { task: DashboardTask }) { return <Link to={`/tasks/${task.id}`}><div><strong>{task.title}</strong>{task.delayed && <span>지연</span>}</div><small>{task.groupName} · {task.priority} · {task.dueAt?.slice(0, 16) ?? '마감 없음'}</small></Link>; }

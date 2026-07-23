import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { authApi, MeResponse } from '../api/authApi';
import { accessToken } from '../api/client';
import { notificationApi } from '../api/notificationApi';
import { dashboardApi, DashboardTask, PersonalDashboard } from '../api/dashboardApi';
import { groupApi, GroupResponse } from '../api/groupApi';
import { AppNavigation } from './AppNavigation';
import { useLanguage } from './LanguageContext';

export function HomePage() {
  const { t } = useLanguage();
  const [me, setMe] = useState<MeResponse>();
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dashboard, setDashboard] = useState<PersonalDashboard>();
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  useEffect(() => {
    async function load() {
      try {
        if (!accessToken.get()) {
          const token = await authApi.refresh();
          accessToken.set(token.accessToken);
        }
        setMe(await authApi.me());
        const [dashboardValue, groupValues] = await Promise.all([
          dashboardApi.personal(),
          groupApi.list().catch(() => [] as GroupResponse[]),
        ]);
        setDashboard(dashboardValue);
        setGroups(groupValues);
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
  if (loading) return <main className="center-page">인증 상태 확인 중...</main>;
  if (!me) return <Navigate to="/login" replace />;
  return <><AppNavigation unreadCount={unreadCount} /><main className="personal-dashboard-page app-page"><header className="personal-dashboard-header"><div><div><span className="page-eyebrow">TODAY</span><h1>{t(`${me.name}님, 오늘도 반가워요!`, `Welcome back, ${me.name}!`)}</h1><p>{t('중요한 일부터 하나씩 가볍게 시작해 볼까요?', 'Let’s start with what matters most today.')}</p></div></div></header>
    {dashboard && <><section className="dashboard-panel home-group-panel"><div className="dashboard-panel-title inline"><div><span className="page-eyebrow">SHORTCUTS</span><h2>{t('바로가기', 'Shortcuts')}</h2><p>{t('참여 중인 그룹으로 바로 이동할 수 있어요.', 'Jump to one of your team groups.')}</p></div><Link to="/groups">{t('전체 보기', 'View all')}</Link></div>
        {groups.filter((group) => group.type === 'TEAM').length === 0 ? <p className="empty-state">{t('참여 중인 그룹이 없습니다.', 'You have not joined any groups yet.')}</p> : <div className="home-group-list">{groups.filter((group) => group.type === 'TEAM').map((group, index) => <Link to={`/groups/${group.id}/dashboard`} key={group.id}><span className={`home-group-avatar home-group-avatar-${index % 4}`}>{group.name.trim().charAt(0).toUpperCase() || 'G'}</span><span><strong>{group.name}</strong><small>{t(group.role === 'LEADER' ? '팀장' : '팀원', group.role === 'LEADER' ? 'Leader' : 'Member')}</small></span></Link>)}</div>}
      </section>
      <section className="dashboard-two-columns"><section className="dashboard-panel"><h2>{t('내 우선 업무', 'Priority tasks')}</h2>{dashboard.priorityTasks.length === 0 ? <p className="empty-state">{t('진행할 담당 업무가 없습니다.', 'No assigned tasks to work on.')}</p> : <div className="dashboard-task-list">{dashboard.priorityTasks.map((task) => <PersonalTask task={task} key={task.id} />)}</div>}</section><section className="dashboard-panel"><h2>{t('다가오는 일정', 'Upcoming events')}</h2>{dashboard.upcomingItems.length === 0 ? <p className="empty-state">{t('7일 안에 예정된 일정이 없습니다.', 'No events scheduled in the next 7 days.')}</p> : <div className="upcoming-list">{dashboard.upcomingItems.map((item) => <Link to={item.sourceTaskId ? `/tasks/${item.sourceTaskId}` : '/calendar'} key={`${item.source}-${item.eventId ?? item.sourceTaskId}`}><strong>{item.title}</strong><span>{item.startAt.slice(0, 16)} · {item.groupName}</span></Link>)}</div>}</section></section>
      <section className="dashboard-two-columns"><section className="dashboard-panel"><h2>{t('그룹별 내 업무', 'Tasks by group')}</h2>{dashboard.groups.length === 0 ? <p className="empty-state">{t('그룹별 담당 업무가 없습니다.', 'No group assignments yet.')}</p> : <div className="personal-group-metrics">{dashboard.groups.map((group) => <Link to={`/groups/${group.groupId}/dashboard`} key={group.groupId}><strong>{group.groupName}</strong><span>{group.assignedCount === 0 ? t('담당 업무가 없습니다.', 'No assigned tasks.') : t(`담당 ${group.assignedCount} · 진행 ${group.activeCount} · 완료 ${group.completedCount} · 지연 ${group.delayedCount}`, `Assigned ${group.assignedCount} · Active ${group.activeCount} · Done ${group.completedCount} · Overdue ${group.delayedCount}`)}</span></Link>)}</div>}</section><section className="dashboard-panel"><div className="dashboard-panel-title inline"><h2>{t('미확인 알림', 'Unread alerts')}</h2><Link to="/notifications">{t('전체 보기 →', 'View all →')}</Link></div>{dashboard.unreadNotifications.length === 0 ? <p className="empty-state">{t('확인하지 않은 알림이 없습니다.', 'You are all caught up.')}</p> : <div className="recent-dashboard-notifications">{dashboard.unreadNotifications.map((item) => <Link to="/notifications" key={item.id}><strong>{item.title}</strong><span>{item.message}</span></Link>)}</div>}</section></section>
    </>}
  </main></>;
}

function PersonalTask({ task }: { task: DashboardTask }) { return <Link to={`/tasks/${task.id}`}><div><strong>{task.title}</strong>{task.delayed && <span>지연</span>}</div><small>{task.groupName} · {task.startAt ? `시작 ${task.startAt.slice(0, 16)} · ` : ''}{task.dueAt ? `마감 ${task.dueAt.slice(0, 16)}` : '마감 없음'}</small></Link>; }

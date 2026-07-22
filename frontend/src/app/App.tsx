import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { OAuthCallbackPage } from '../features/auth/pages/OAuthCallbackPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { FindUsernamePage, ForgotPasswordPage, ResetPasswordPage } from '../features/auth/pages/RecoveryPages';
import { SignupPage } from '../features/auth/pages/SignupPage';
import { GroupsPage } from '../features/group/pages/GroupsPage';
import { GroupDetailPage } from '../features/group/pages/GroupDetailPage';
import { InvitationAcceptPage } from '../features/group/pages/InvitationAcceptPage';
import { AccountPage } from '../features/user/pages/AccountPage';
import { ProfilePage } from '../features/user/pages/ProfilePage';
import { TasksPage } from '../features/task/pages/TasksPage';
import { TaskDetailPage } from '../features/task/pages/TaskDetailPage';
import { HomePage } from './HomePage';
import { NotificationsPage } from '../features/notification/pages/NotificationsPage';
import { CalendarPage } from '../features/calendar/pages/CalendarPage';
import { GroupDashboardPage } from '../features/dashboard/pages/GroupDashboardPage';
import { PwaStatus } from './PwaStatus';

export default function App() {
  return <BrowserRouter>
    <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
    <RouteAnnouncer />
    <div id="main-content" tabIndex={-1}><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/account" element={<AccountPage />} />
    <Route path="/groups" element={<GroupsPage />} />
    <Route path="/groups/:groupId" element={<GroupDetailPage />} />
    <Route path="/groups/:groupId/tasks" element={<TasksPage />} />
    <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
    <Route path="/notifications" element={<NotificationsPage />} />
    <Route path="/calendar" element={<CalendarPage />} />
    <Route path="/groups/:groupId/dashboard" element={<GroupDashboardPage />} />
    <Route path="/group-invitations/accept" element={<InvitationAcceptPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/find-username" element={<FindUsernamePage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></div>
    <PwaStatus />
  </BrowserRouter>;
}

function RouteAnnouncer() {
  const location = useLocation();
  const label = pageLabel(location.pathname);
  useEffect(() => {
    document.title = `${label} | Team Project`;
    window.requestAnimationFrame(() => document.getElementById('main-content')?.focus());
  }, [label, location.pathname]);
  return <span className="sr-only" role="status" aria-live="polite">{label} 페이지</span>;
}

function pageLabel(pathname: string) {
  if (pathname === '/') return '내 대시보드';
  if (pathname === '/calendar') return '캘린더';
  if (pathname === '/notifications') return '알림';
  if (/^\/groups\/\d+\/dashboard$/.test(pathname)) return '그룹 대시보드';
  if (/^\/groups\/\d+\/tasks$/.test(pathname)) return '업무 목록';
  if (/^\/tasks\/\d+$/.test(pathname)) return '업무 상세';
  if (pathname === '/groups') return '그룹 목록';
  if (/^\/groups\/\d+$/.test(pathname)) return '그룹 상세';
  if (pathname === '/profile') return '프로필';
  if (pathname === '/account') return '계정 설정';
  if (pathname === '/signup') return '회원가입';
  if (pathname === '/login') return '로그인';
  return 'Team Project';
}

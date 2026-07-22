import { CalendarItem } from './calendarApi';
import { request } from './client';
import { NotificationResponse } from './notificationApi';

export type DashboardTask = { id: number; groupId: number; groupName: string; title: string; status: string; priority: string; dueAt?: string; delayed: boolean };
export type PersonalDashboard = {
  generatedAt: string; todayDueCount: number; delayedCount: number; inProgressCount: number; unreadNotificationCount: number;
  priorityTasks: DashboardTask[];
  groups: { groupId: number; groupName: string; groupType: string; assignedCount: number; completedCount: number; activeCount: number; delayedCount: number }[];
  upcomingItems: CalendarItem[];
  recentNotifications: NotificationResponse[];
};
export type StatusCounts = { requested: number; todo: number; inProgress: number; onHold: number; completed: number; rejected: number; cancelled: number; delayed: number };
export type GroupDashboard = {
  generatedAt: string; groupId: number; groupName: string; timezone: string; visibility: string;
  periodFrom: string; periodTo: string; totalCount: number; statuses: StatusCounts; workflowProgressPercent?: number;
  periodCreatedCount: number; periodCompletedCount: number; periodCompletionRatePercent?: number;
  completedWithDueDateCount: number; onTimeCompletedCount: number; onTimeRatePercent?: number; averageCompletionHours?: number;
  members: { memberId: number; userId: number; nickname: string; role: string; assignedCount: number; activeCount: number; completedCount: number; delayedCount: number; onTimeRatePercent?: number }[];
  riskTasks: DashboardTask[];
};

export const dashboardApi = {
  personal: () => request<PersonalDashboard>('/dashboard/me', {}, true),
  group: (groupId: number, from?: string, to?: string) => request<GroupDashboard>(
    `/groups/${groupId}/dashboard${from && to ? `?from=${from}&to=${to}` : ''}`, {}, true,
  ),
};

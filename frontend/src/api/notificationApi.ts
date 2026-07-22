import { request } from './client';

export type NotificationType = 'TASK_REQUESTED' | 'TASK_ASSIGNED' | 'TASK_STATUS_CHANGED' | 'COMMENT_CREATED' | 'COMMENT_MENTIONED';

export type NotificationResponse = {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  actorUserId?: number;
  actorNickname?: string;
  groupId?: number;
  taskId?: number;
  commentId?: number;
  read: boolean;
  readAt?: string;
  createdAt: string;
};

export type NotificationPageResponse = {
  items: NotificationResponse[];
  nextCursor?: number;
  hasNext: boolean;
  unreadCount: number;
};

export const notificationApi = {
  list: (size = 20, cursor?: number) => request<NotificationPageResponse>(
    `/notifications?size=${size}${cursor ? `&cursor=${cursor}` : ''}`, {}, true,
  ),
  read: (notificationId: number) => request<NotificationResponse>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  }, true),
  readAll: () => request<{ updatedCount: number }>('/notifications/read-all', {
    method: 'PATCH',
  }, true),
};

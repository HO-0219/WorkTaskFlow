import { request } from './client';

export type AssistantTurn = { role: 'user' | 'assistant'; content: string };
export type AssistantChatResponse = {
  message: string;
  pendingActionId?: number;
  actionType?: string;
  actionSummary?: string;
  expiresAt?: string;
};
export type AssistantActionResponse = {
  actionId: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  message: string;
  targetUrl?: string;
  inviteUrl?: string;
};

export const assistantApi = {
  chat: (groupId: number, message: string, history: AssistantTurn[]) =>
    request<AssistantChatResponse>('/assistant/messages', {
      method: 'POST', body: JSON.stringify({ groupId, message, history: history.slice(-10) }),
    }, true),
  confirm: (actionId: number) => request<AssistantActionResponse>(
    `/assistant/actions/${actionId}/confirm`, { method: 'POST' }, true),
  cancel: (actionId: number) => request<AssistantActionResponse>(
    `/assistant/actions/${actionId}/cancel`, { method: 'POST' }, true),
};

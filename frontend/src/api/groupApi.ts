import { request } from './client';

export type GroupResponse = {
  id: number;
  type: 'PERSONAL' | 'TEAM';
  name: string;
  description?: string;
  timezone: string;
  dashboardVisibility: 'LEADER_ONLY' | 'MEMBERS';
  memberId: number;
  role: 'LEADER' | 'MEMBER';
  createdAt: string;
  updatedAt: string;
};

export type CreateGroupRequest = {
  name: string;
  description?: string;
  timezone?: string;
};

export type UpdateGroupRequest = {
  name?: string;
  description?: string;
  timezone?: string;
  dashboardVisibility?: 'LEADER_ONLY' | 'MEMBERS';
};

export type MemberResponse = {
  id: number;
  userId: number;
  nickname: string;
  profileImageUrl?: string;
  role: 'LEADER' | 'MEMBER';
  status: 'ACTIVE' | 'LEFT' | 'REMOVED';
  joinedAt: string;
};

export type InvitationResponse = {
  id: number;
  groupId: number;
  email: string;
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
};

export const groupApi = {
  list: () => request<GroupResponse[]>('/groups', {}, true),
  create: (body: CreateGroupRequest) => request<GroupResponse>('/groups', {
    method: 'POST', body: JSON.stringify(body),
  }, true),
  get: (groupId: number) => request<GroupResponse>(`/groups/${groupId}`, {}, true),
  update: (groupId: number, body: UpdateGroupRequest) => request<GroupResponse>(`/groups/${groupId}`, {
    method: 'PATCH', body: JSON.stringify(body),
  }, true),
  members: (groupId: number) => request<MemberResponse[]>(`/groups/${groupId}/members`, {}, true),
  invitations: (groupId: number) => request<InvitationResponse[]>(`/groups/${groupId}/invitations`, {}, true),
  invite: (groupId: number, email: string) => request<InvitationResponse>(`/groups/${groupId}/invitations`, {
    method: 'POST', body: JSON.stringify({ email }),
  }, true),
  cancelInvitation: (groupId: number, invitationId: number) => request<void>(`/groups/${groupId}/invitations/${invitationId}`, {
    method: 'DELETE',
  }, true),
  acceptInvitation: (token: string) => request<MemberResponse>(`/group-invitations/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
  }, true),
  changeMemberRole: (groupId: number, memberId: number, role: 'LEADER' | 'MEMBER') =>
    request<MemberResponse>(`/groups/${groupId}/members/${memberId}/role`, {
      method: 'PATCH', body: JSON.stringify({ role }),
    }, true),
  removeMember: (groupId: number, memberId: number) => request<void>(`/groups/${groupId}/members/${memberId}`, {
    method: 'DELETE',
  }, true),
  leave: (groupId: number) => request<void>(`/groups/${groupId}/members/me`, {
    method: 'DELETE',
  }, true),
};

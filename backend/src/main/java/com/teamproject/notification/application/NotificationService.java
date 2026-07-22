package com.teamproject.notification.application;

import com.teamproject.comment.domain.TaskComment;
import com.teamproject.common.exception.ApplicationException;
import com.teamproject.group.domain.GroupMember;
import com.teamproject.group.domain.GroupMemberRepository;
import com.teamproject.notification.application.dto.NotificationDtos.NotificationPageResponse;
import com.teamproject.notification.application.dto.NotificationDtos.NotificationResponse;
import com.teamproject.notification.application.dto.NotificationDtos.ReadAllResponse;
import com.teamproject.notification.domain.Notification;
import com.teamproject.notification.domain.NotificationRepository;
import com.teamproject.task.domain.Task;
import com.teamproject.user.domain.User;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;

@Service
public class NotificationService {
    private final NotificationRepository notifications;
    private final GroupMemberRepository members;

    public NotificationService(NotificationRepository notifications, GroupMemberRepository members) {
        this.notifications = notifications;
        this.members = members;
    }

    @Transactional
    public void taskRequested(Task task, GroupMember actor) {
        if (task.getGroup().getType() != com.teamproject.group.domain.Group.Type.TEAM) return;
        var leaders = members.findAllByGroupIdAndStatusOrderByRoleAscJoinedAtAsc(
                task.getGroup().getId(), GroupMember.Status.ACTIVE).stream()
                .filter(member -> member.getRole() == GroupMember.Role.LEADER).toList();
        create(leaders, actor.getUser(), task, null, Notification.Type.TASK_REQUESTED,
                "TASK_REQUESTED:" + task.getId(), "새 업무 요청",
                "'" + task.getTitle() + "' 업무가 승인을 기다리고 있습니다.");
    }

    @Transactional
    public void taskAssigned(Task task, GroupMember actor, GroupMember assignee) {
        create(List.of(assignee), actor.getUser(), task, null, Notification.Type.TASK_ASSIGNED,
                "TASK_ASSIGNED:" + task.getId() + ":" + task.getVersion(), "업무 담당자 지정",
                "'" + task.getTitle() + "' 업무의 담당자로 지정되었습니다.");
    }

    @Transactional
    public void taskStatusChanged(Task task, GroupMember actor) {
        Collection<GroupMember> recipients;
        if (task.getStatus() == Task.Status.COMPLETED) {
            recipients = members.findAllByGroupIdAndStatusOrderByRoleAscJoinedAtAsc(
                    task.getGroup().getId(), GroupMember.Status.ACTIVE).stream()
                    .filter(member -> member.getRole() == GroupMember.Role.LEADER
                            || member.getId().equals(task.getRequester().getId())).toList();
        } else if (task.getStatus() == Task.Status.REJECTED || task.getStatus() == Task.Status.CANCELLED) {
            recipients = List.of(task.getRequester());
        } else {
            return;
        }
        create(recipients, actor.getUser(), task, null, Notification.Type.TASK_STATUS_CHANGED,
                "TASK_STATUS:" + task.getId() + ":" + task.getVersion(), "업무 상태 변경",
                "'" + task.getTitle() + "' 업무가 " + statusLabel(task.getStatus()) + " 상태가 되었습니다.");
    }

    @Transactional
    public void commentCreated(TaskComment comment, Collection<GroupMember> recipients) {
        create(recipients, comment.getAuthor().getUser(), comment.getTask(), comment,
                Notification.Type.COMMENT_CREATED, "COMMENT_CREATED:" + comment.getId(), "새 댓글",
                "'" + comment.getTask().getTitle() + "' 업무에 댓글이 등록되었습니다.");
    }

    @Transactional
    public void commentMentioned(TaskComment comment, Collection<GroupMember> recipients) {
        for (GroupMember recipient : recipients) {
            create(List.of(recipient), comment.getAuthor().getUser(), comment.getTask(), comment,
                    Notification.Type.COMMENT_MENTIONED,
                    "COMMENT_MENTIONED:" + comment.getId() + ":" + comment.getVersion()
                            + ":" + recipient.getUser().getId(),
                    "댓글에서 멘션됨", "'" + comment.getTask().getTitle() + "' 업무 댓글에서 회원님을 멘션했습니다.");
        }
    }

    @Transactional(readOnly = true)
    public NotificationPageResponse list(Long userId, Long cursor, int requestedSize) {
        int size = Math.min(Math.max(requestedSize, 1), 50);
        var page = cursor == null
                ? notifications.findByRecipientIdOrderByIdDesc(userId, PageRequest.of(0, size))
                : notifications.findByRecipientIdAndIdLessThanOrderByIdDesc(userId, cursor, PageRequest.of(0, size));
        var items = page.getContent().stream().map(this::response).toList();
        Long nextCursor = page.hasNext() && !items.isEmpty() ? items.get(items.size() - 1).id() : null;
        return new NotificationPageResponse(items, nextCursor, page.hasNext(),
                notifications.countByRecipientIdAndReadAtIsNull(userId));
    }

    @Transactional
    public NotificationResponse read(Long userId, Long notificationId) {
        Notification notification = notifications.findByIdAndRecipientId(notificationId, userId)
                .orElseThrow(() -> new ApplicationException("NOTIFICATION_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "알림을 찾을 수 없습니다."));
        notification.read();
        return response(notification);
    }

    @Transactional
    public ReadAllResponse readAll(Long userId) {
        return new ReadAllResponse(notifications.markAllRead(userId, LocalDateTime.now()));
    }

    private void create(Collection<GroupMember> rawRecipients, User actor, Task task, TaskComment comment,
            Notification.Type type, String eventKey, String title, String message) {
        var recipients = new LinkedHashMap<Long, User>();
        rawRecipients.forEach(member -> recipients.put(member.getUser().getId(), member.getUser()));
        recipients.remove(actor.getId());
        notifications.saveAll(recipients.values().stream().map(recipient -> new Notification(
                recipient, actor, task.getGroup(), task, comment, type, eventKey, title, message)).toList());
    }

    private NotificationResponse response(Notification value) {
        return new NotificationResponse(value.getId(), value.getType().name(), value.getTitle(), value.getMessage(),
                value.getActor() == null ? null : value.getActor().getId(),
                value.getActor() == null ? null : value.getActor().getNickname(),
                value.getGroup() == null ? null : value.getGroup().getId(),
                value.getTask() == null ? null : value.getTask().getId(),
                value.getComment() == null ? null : value.getComment().getId(),
                value.getReadAt() != null, value.getReadAt(), value.getCreatedAt());
    }

    private String statusLabel(Task.Status status) {
        return switch (status) {
            case COMPLETED -> "완료";
            case REJECTED -> "반려";
            case CANCELLED -> "취소";
            default -> status.name();
        };
    }
}

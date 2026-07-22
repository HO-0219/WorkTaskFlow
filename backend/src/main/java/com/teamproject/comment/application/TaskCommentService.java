package com.teamproject.comment.application;

import com.teamproject.comment.application.dto.CommentDtos.CommentResponse;
import com.teamproject.comment.application.dto.CommentDtos.CommentMentionResponse;
import com.teamproject.comment.application.dto.CommentDtos.CreateCommentRequest;
import com.teamproject.comment.application.dto.CommentDtos.UpdateCommentRequest;
import com.teamproject.comment.domain.TaskComment;
import com.teamproject.comment.domain.TaskCommentRepository;
import com.teamproject.comment.domain.CommentMention;
import com.teamproject.comment.domain.CommentMentionRepository;
import com.teamproject.common.exception.ApplicationException;
import com.teamproject.group.application.GroupAuthorization;
import com.teamproject.group.domain.GroupMember;
import com.teamproject.notification.application.NotificationService;
import com.teamproject.task.domain.Task;
import com.teamproject.task.domain.TaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.ArrayList;
import java.util.Set;

@Service
public class TaskCommentService {
    private static final String DELETED_CONTENT = "삭제된 댓글입니다.";
    private final TaskRepository tasks;
    private final TaskCommentRepository comments;
    private final CommentMentionRepository mentions;
    private final GroupAuthorization authorization;
    private final NotificationService notifications;

    public TaskCommentService(TaskRepository tasks, TaskCommentRepository comments,
            CommentMentionRepository mentions,
            GroupAuthorization authorization, NotificationService notifications) {
        this.tasks = tasks;
        this.comments = comments;
        this.mentions = mentions;
        this.authorization = authorization;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> list(Long userId, Long taskId) {
        Task task = task(taskId);
        authorization.requireActiveMember(task.getGroup().getId(), userId);
        return comments.findAllByTaskIdOrderByCreatedAtAscIdAsc(taskId).stream()
                .map(this::response).toList();
    }

    @Transactional
    public CommentResponse create(Long userId, Long taskId, CreateCommentRequest request) {
        Task task = task(taskId);
        GroupMember author = authorization.requireActiveMember(task.getGroup().getId(), userId);
        TaskComment comment = comments.save(new TaskComment(task, author, request.content().trim()));
        List<GroupMember> mentionedMembers = replaceMentions(comment, request.mentionedMemberIds());
        List<GroupMember> recipients = new ArrayList<>(mentionedMembers);
        if (task.getAssignee() != null) recipients.add(task.getAssignee());
        notifications.commentCreated(comment, recipients);
        return response(comment);
    }

    @Transactional
    public CommentResponse update(Long userId, Long commentId, UpdateCommentRequest request) {
        TaskComment comment = comment(commentId);
        GroupMember actor = authorization.requireActiveMember(comment.getTask().getGroup().getId(), userId);
        requireAuthor(comment, actor);
        requireActive(comment);
        requireVersion(comment, request.expectedVersion());
        Set<Long> previousMentionIds = mentions.findAllByCommentIdOrderByIdAsc(comment.getId()).stream()
                .map(mention -> mention.getMentionedMember().getId()).collect(java.util.stream.Collectors.toSet());
        comment.update(request.content().trim());
        comments.flush();
        List<GroupMember> mentionedMembers = replaceMentions(comment, request.mentionedMemberIds());
        notifications.commentMentioned(comment, mentionedMembers.stream()
                .filter(member -> !previousMentionIds.contains(member.getId())).toList());
        return response(comment);
    }

    @Transactional
    public void delete(Long userId, Long commentId, Long expectedVersion) {
        TaskComment comment = comment(commentId);
        GroupMember actor = authorization.requireActiveMember(comment.getTask().getGroup().getId(), userId);
        requireAuthor(comment, actor);
        requireActive(comment);
        requireVersion(comment, expectedVersion);
        comment.softDelete();
        comments.flush();
    }

    private void requireAuthor(TaskComment comment, GroupMember actor) {
        if (!comment.getAuthor().getId().equals(actor.getId())) {
            throw new ApplicationException("COMMENT_AUTHOR_REQUIRED", HttpStatus.FORBIDDEN,
                    "댓글 작성자만 수정하거나 삭제할 수 있습니다.");
        }
    }

    private void requireActive(TaskComment comment) {
        if (comment.isDeleted()) {
            throw new ApplicationException("COMMENT_ALREADY_DELETED", HttpStatus.CONFLICT,
                    "이미 삭제된 댓글입니다.");
        }
    }

    private void requireVersion(TaskComment comment, Long expectedVersion) {
        if (comment.getVersion() != expectedVersion) {
            throw new ApplicationException("COMMENT_VERSION_CONFLICT", HttpStatus.CONFLICT,
                    "댓글이 이미 변경되었습니다. 새로고침 후 다시 시도해 주세요.");
        }
    }

    private CommentResponse response(TaskComment comment) {
        return new CommentResponse(comment.getId(), comment.getTask().getId(),
                comment.getAuthor().getId(), comment.getAuthor().getUser().getNickname(),
                comment.isDeleted() ? DELETED_CONTENT : comment.getContent(), comment.isDeleted(),
                comment.isDeleted() ? List.of() : mentions.findAllByCommentIdOrderByIdAsc(comment.getId()).stream()
                        .map(this::mentionResponse).toList(),
                comment.getVersion(), comment.getCreatedAt(), comment.getUpdatedAt(), comment.getDeletedAt());
    }

    private List<GroupMember> replaceMentions(TaskComment comment, List<Long> mentionedMemberIds) {
        mentions.deleteAllByCommentId(comment.getId());
        mentions.flush();
        if (mentionedMemberIds == null || mentionedMemberIds.isEmpty()) return List.of();
        Long groupId = comment.getTask().getGroup().getId();
        List<GroupMember> mentionedMembers = new LinkedHashSet<>(mentionedMemberIds).stream()
                .map(memberId -> authorization.requireActiveMemberById(groupId, memberId))
                .toList();
        List<CommentMention> replacements = mentionedMembers.stream()
                .map(member -> new CommentMention(comment, member)).toList();
        mentions.saveAll(replacements);
        mentions.flush();
        return mentionedMembers;
    }

    private CommentMentionResponse mentionResponse(CommentMention mention) {
        GroupMember member = mention.getMentionedMember();
        return new CommentMentionResponse(mention.getId(), member.getId(),
                member.getUser().getId(), member.getUser().getNickname());
    }

    private Task task(Long taskId) {
        return tasks.findById(taskId).orElseThrow(() -> new ApplicationException(
                "TASK_NOT_FOUND", HttpStatus.NOT_FOUND, "업무를 찾을 수 없습니다."));
    }

    private TaskComment comment(Long commentId) {
        return comments.findById(commentId).orElseThrow(() -> new ApplicationException(
                "COMMENT_NOT_FOUND", HttpStatus.NOT_FOUND, "댓글을 찾을 수 없습니다."));
    }
}

package com.teamproject.task.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public final class TaskDtos {
    private TaskDtos() {}

    public record CreateTaskRequest(
            @NotBlank @Size(max = 120) String title,
            @Size(max = 5000) String description,
            String priority,
            LocalDateTime dueAt) {}

    public record TaskResponse(
            Long id, Long groupId, Long requesterMemberId, Long approverMemberId, Long assigneeMemberId,
            String title, String description, String priority, String status,
            LocalDateTime startAt, LocalDateTime dueAt, LocalDateTime completedAt,
            String holdReason, String stopReason,
            boolean delayed, long version, LocalDateTime createdAt, LocalDateTime updatedAt) {}

    public record TransitionTaskRequest(
            @NotBlank String action,
            @Size(max = 500) String reason,
            @NotNull @PositiveOrZero Long expectedVersion) {}

    public record AssignTaskRequest(
            @NotNull @Positive Long assigneeMemberId,
            @NotNull @PositiveOrZero Long expectedVersion) {}

    public record UpdateTaskRequest(
            @Size(max = 120) String title,
            @Size(max = 5000) String description,
            String priority,
            LocalDateTime dueAt,
            Boolean clearDueAt,
            @NotNull @PositiveOrZero Long expectedVersion) {}

    public record TaskHistoryResponse(
            Long id, String fromStatus, String toStatus, Long changedByMemberId,
            String reason, LocalDateTime createdAt) {}
}

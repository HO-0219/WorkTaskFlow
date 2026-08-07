package com.teamproject.assistant.application.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public final class AiAssistantDtos {
    private AiAssistantDtos() {}

    public record ChatTurn(@NotBlank String role, @NotBlank @Size(max = 2000) String content) {}
    public record ChatRequest(
            @NotNull @Positive Long groupId,
            @NotBlank @Size(max = 2000) String message,
            @Size(max = 10) List<@Valid ChatTurn> history) {}
    public record ChatResponse(
            String message, Long pendingActionId, String actionType,
            String actionSummary, LocalDateTime expiresAt) {}
    public record ActionResponse(
            Long actionId, String status, String message, String targetUrl,
            String inviteUrl) {}
}

package com.teamproject.assistant.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teamproject.assistant.application.dto.AiAssistantDtos.ChatRequest;
import com.teamproject.assistant.application.dto.AiAssistantDtos.ChatResponse;
import com.teamproject.assistant.application.port.AiAssistantGateway;
import com.teamproject.assistant.application.port.AiAssistantGateway.TextDecision;
import com.teamproject.assistant.application.port.AiAssistantGateway.ToolDecision;
import com.teamproject.assistant.domain.AiAssistantAction;
import com.teamproject.assistant.domain.AiAssistantActionRepository;
import com.teamproject.common.exception.ApplicationException;
import com.teamproject.user.domain.UserRepository;
import java.time.LocalDateTime;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AiAssistantChatService {
    private static final Set<String> TOOLS = Set.of(
            "create_task", "create_group_invite_link", "approve_task", "add_task_checklist");
    private final AiAssistantContextService contexts;
    private final AiAssistantGateway gateway;
    private final AiAssistantActionRepository actions;
    private final UserRepository users;
    private final ObjectMapper objectMapper;

    public AiAssistantChatService(AiAssistantContextService contexts, AiAssistantGateway gateway,
            AiAssistantActionRepository actions, UserRepository users, ObjectMapper objectMapper) {
        this.contexts = contexts;
        this.gateway = gateway;
        this.actions = actions;
        this.users = users;
        this.objectMapper = objectMapper;
    }

    public ChatResponse chat(Long userId, ChatRequest request) {
        var context = contexts.load(userId, request.groupId());
        var decision = gateway.decide(input(context.json(), request));
        if (decision instanceof TextDecision text) {
            return new ChatResponse(text.text(), null, null, null, null);
        }
        ToolDecision tool = (ToolDecision) decision;
        if (!TOOLS.contains(tool.name())) invalidTool();
        JsonNode arguments = parse(tool.argumentsJson());
        validateScope(tool.name(), arguments, context.json());
        String summary = summary(tool.name(), arguments);
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(10);
        var user = users.findById(userId).orElseThrow();
        var action = actions.save(new AiAssistantAction(user, context.group(), tool.name(),
                arguments.toString(), summary, expiresAt));
        return new ChatResponse("아래 작업을 실행할까요? 내용을 확인해 주세요.",
                action.getId(), tool.name(), summary, expiresAt);
    }

    private String input(String context, ChatRequest request) {
        StringBuilder value = new StringBuilder("CURRENT_CONTEXT\n").append(context).append("\n\n");
        if (request.history() != null) {
            request.history().forEach(turn -> {
                String role = turn.role().equalsIgnoreCase("assistant") ? "ASSISTANT" : "USER";
                value.append(role).append(": ").append(turn.content()).append('\n');
            });
        }
        return value.append("USER: ").append(request.message()).toString();
    }

    private JsonNode parse(String value) {
        try {
            JsonNode node = objectMapper.readTree(value);
            if (!node.isObject()) invalidTool();
            return node;
        } catch (Exception exception) {
            throw new ApplicationException("AI_ASSISTANT_INVALID_ACTION", HttpStatus.BAD_GATEWAY,
                    "AI 비서가 올바르지 않은 작업을 제안했습니다. 다시 요청해 주세요.");
        }
    }

    private void validateScope(String tool, JsonNode arguments, String contextJson) {
        if ((tool.equals("approve_task") || tool.equals("add_task_checklist"))) {
            long taskId = arguments.path("taskId").asLong(0);
            if (taskId <= 0 || !contextJson.contains("\"id\":" + taskId + ",")) invalidTool();
        }
    }

    private String summary(String tool, JsonNode args) {
        return switch (tool) {
            case "create_task" -> "업무 생성: " + clipped(args.path("title").asText(), 120);
            case "create_group_invite_link" -> "새 그룹 초대 링크 생성";
            case "approve_task" -> "업무 #" + args.path("taskId").asLong() + " 승인";
            case "add_task_checklist" -> "업무 #" + args.path("taskId").asLong()
                    + "에 체크리스트 " + args.path("items").size() + "개 추가";
            default -> invalidSummary();
        };
    }

    private String clipped(String value, int max) {
        if (value == null || value.isBlank()) invalidTool();
        return value.length() <= max ? value : value.substring(0, max);
    }

    private JsonNode invalidTool() {
        throw new ApplicationException("AI_ASSISTANT_INVALID_ACTION", HttpStatus.BAD_GATEWAY,
                "AI 비서가 올바르지 않은 작업을 제안했습니다. 다시 요청해 주세요.");
    }

    private String invalidSummary() {
        invalidTool();
        throw new IllegalStateException("unreachable");
    }
}

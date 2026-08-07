package com.teamproject.assistant.presentation;

import com.teamproject.assistant.application.AiAssistantActionService;
import com.teamproject.assistant.application.AiAssistantChatService;
import com.teamproject.assistant.application.dto.AiAssistantDtos.ActionResponse;
import com.teamproject.assistant.application.dto.AiAssistantDtos.ChatRequest;
import com.teamproject.assistant.application.dto.AiAssistantDtos.ChatResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/assistant")
public class AiAssistantController {
    private final AiAssistantChatService chat;
    private final AiAssistantActionService actions;

    public AiAssistantController(AiAssistantChatService chat, AiAssistantActionService actions) {
        this.chat = chat;
        this.actions = actions;
    }

    @PostMapping("/messages")
    ChatResponse message(Authentication authentication, @Valid @RequestBody ChatRequest request) {
        return chat.chat((Long) authentication.getPrincipal(), request);
    }

    @PostMapping("/actions/{actionId}/confirm")
    ActionResponse confirm(Authentication authentication, @PathVariable Long actionId) {
        return actions.confirm((Long) authentication.getPrincipal(), actionId);
    }

    @PostMapping("/actions/{actionId}/cancel")
    ActionResponse cancel(Authentication authentication, @PathVariable Long actionId) {
        return actions.cancel((Long) authentication.getPrincipal(), actionId);
    }
}

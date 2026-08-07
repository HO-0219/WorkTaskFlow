package com.teamproject.assistant.application.port;

public interface AiAssistantGateway {
    Decision decide(String input);

    sealed interface Decision permits TextDecision, ToolDecision {}
    record TextDecision(String text) implements Decision {}
    record ToolDecision(String name, String argumentsJson) implements Decision {}
}

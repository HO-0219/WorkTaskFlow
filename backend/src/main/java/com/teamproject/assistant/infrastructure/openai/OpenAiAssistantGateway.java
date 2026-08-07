package com.teamproject.assistant.infrastructure.openai;

import com.openai.client.OpenAIClient;
import com.openai.core.JsonValue;
import com.openai.models.responses.FunctionTool;
import com.openai.models.responses.ResponseCreateParams;
import com.teamproject.assistant.application.port.AiAssistantGateway;
import com.teamproject.common.exception.ApplicationException;
import com.teamproject.report.infrastructure.openai.OpenAiReportProperties;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class OpenAiAssistantGateway implements AiAssistantGateway {
    private static final String INSTRUCTIONS = """
            당신은 팀 업무 서비스의 AI 비서다. 제공된 CURRENT_CONTEXT 안의 데이터만 사실로 사용한다.
            사용자가 실행을 요청하면 정확히 하나의 함수만 호출한다. 함수 호출은 제안일 뿐이며 실행됐다고 말하지 않는다.
            업무 생성, 업무 승인, 체크리스트 추가, 그룹 초대 링크 생성 외의 변경은 지원하지 않는다.
            대상이나 필수 값이 모호하면 함수를 호출하지 말고 짧은 확인 질문을 한다.
            사용자가 단순 조회나 설명을 요청하면 한국어로 간결하게 답한다.
            도구 인자의 taskId는 CURRENT_CONTEXT에 실제로 있는 값만 사용한다.
            """;

    private final OpenAIClient client;
    private final OpenAiAssistantProperties properties;
    private final OpenAiReportProperties sharedProperties;

    public OpenAiAssistantGateway(@Qualifier("openAiAssistantClient") OpenAIClient client,
            OpenAiAssistantProperties properties, OpenAiReportProperties sharedProperties) {
        this.client = client;
        this.properties = properties;
        this.sharedProperties = sharedProperties;
    }

    @Override
    public Decision decide(String input) {
        if (!properties.enabled() || !sharedProperties.hasApiKey() || properties.model().isBlank()) {
            throw new ApplicationException("AI_ASSISTANT_NOT_CONFIGURED", HttpStatus.SERVICE_UNAVAILABLE,
                    "AI 비서가 아직 활성화되지 않았습니다.");
        }
        var params = ResponseCreateParams.builder()
                .instructions(INSTRUCTIONS)
                .input(input)
                .model(properties.model())
                .maxOutputTokens(properties.maxOutputTokens())
                .maxToolCalls(1)
                .parallelToolCalls(false)
                .store(false)
                .addTool(tool("create_task", "선택한 그룹에 새 업무와 초기 체크리스트를 만든다.",
                        Map.of(
                                "title", string(),
                                "description", nullableString(),
                                "priority", enumValue("LOW", "NORMAL", "HIGH", "URGENT"),
                                "dueAt", nullableString(),
                                "checklistItems", nullableStringArray()),
                        List.of("title", "description", "priority", "dueAt", "checklistItems")))
                .addTool(tool("create_group_invite_link", "선택한 팀 그룹의 새 초대 링크를 만든다.",
                        Map.of(), List.of()))
                .addTool(tool("approve_task", "승인 대기(REQUESTED) 업무를 승인한다.",
                        Map.of("taskId", integer()), List.of("taskId")))
                .addTool(tool("add_task_checklist", "업무에 체크리스트 항목들을 추가한다.",
                        Map.of("taskId", integer(), "items", stringArray()),
                        List.of("taskId", "items")))
                .build();
        try {
            var response = client.responses().create(params);
            var call = response.output().stream().flatMap(item -> item.functionCall().stream()).findFirst();
            if (call.isPresent()) {
                return new ToolDecision(call.get().name(), call.get().arguments());
            }
            String text = response.output().stream()
                    .flatMap(item -> item.message().stream())
                    .flatMap(message -> message.content().stream())
                    .flatMap(content -> content.outputText().stream())
                    .map(value -> value.text())
                    .findFirst().orElse("요청을 이해하지 못했습니다. 조금 더 구체적으로 말씀해 주세요.");
            return new TextDecision(text);
        } catch (ApplicationException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ApplicationException("AI_ASSISTANT_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE,
                    "AI 비서가 잠시 응답하지 않습니다. 잠시 후 다시 시도해 주세요.");
        }
    }

    private FunctionTool tool(String name, String description, Map<String, Object> properties,
            List<String> required) {
        Map<String, Object> schema = Map.of(
                "type", "object",
                "properties", properties,
                "required", required,
                "additionalProperties", false);
        return FunctionTool.builder().name(name).description(description).strict(true)
                .parameters(FunctionTool.Parameters.builder()
                        .additionalProperties(JsonValue.from(schema).convert(Map.class))
                        .build())
                .build();
    }

    private Map<String, Object> string() { return Map.of("type", "string"); }
    private Map<String, Object> nullableString() { return Map.of("type", List.of("string", "null")); }
    private Map<String, Object> integer() { return Map.of("type", "integer", "minimum", 1); }
    private Map<String, Object> enumValue(String... values) {
        return Map.of("type", "string", "enum", List.of(values));
    }
    private Map<String, Object> stringArray() {
        return Map.of("type", "array", "items", string(), "minItems", 1, "maxItems", 30);
    }
    private Map<String, Object> nullableStringArray() {
        return Map.of("type", List.of("array", "null"), "items", string(), "maxItems", 30);
    }
}

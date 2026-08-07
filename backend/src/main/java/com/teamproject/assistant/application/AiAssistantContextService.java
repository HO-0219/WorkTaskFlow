package com.teamproject.assistant.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teamproject.group.application.GroupAuthorization;
import com.teamproject.report.domain.AiWeeklyReportRevisionRepository;
import com.teamproject.task.domain.TaskRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiAssistantContextService {
    private final GroupAuthorization authorization;
    private final TaskRepository tasks;
    private final AiWeeklyReportRevisionRepository reports;
    private final ObjectMapper objectMapper;

    public AiAssistantContextService(GroupAuthorization authorization, TaskRepository tasks,
            AiWeeklyReportRevisionRepository reports, ObjectMapper objectMapper) {
        this.authorization = authorization;
        this.tasks = tasks;
        this.reports = reports;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Context load(Long userId, Long groupId) {
        var member = authorization.requireActiveMember(groupId, userId);
        var group = member.getGroup();
        var context = new LinkedHashMap<String, Object>();
        context.put("now", LocalDateTime.now().toString());
        context.put("group", new GroupContext(group.getId(), group.getName(), group.getType().name(),
                group.getTimezone(), member.getRole().name()));
        context.put("recentTasks", tasks.findByGroupIdOrderByUpdatedAtDescIdDesc(
                groupId, PageRequest.of(0, 30)).stream().map(task -> new TaskContext(
                        task.getId(), task.getTitle(), task.getStatus().name(), task.getPriority().name(),
                        task.getDueAt(), task.getVersion())).toList());
        reports.findTopByGroupIdOrderByPeriodToExclusiveDescRevisionDesc(groupId).ifPresent(report -> {
            String analysis = report.getAnalysisJson();
            context.put("latestWeeklyReport", new ReportContext(report.getPeriodFrom(),
                    report.getPeriodToExclusive(), analysis.substring(0, Math.min(analysis.length(), 6000))));
        });
        try {
            return new Context(group, objectMapper.writeValueAsString(context));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("AI assistant context serialization failed", exception);
        }
    }

    public record Context(com.teamproject.group.domain.Group group, String json) {}
    private record GroupContext(Long id, String name, String type, String timezone, String currentUserRole) {}
    private record TaskContext(Long id, String title, String status, String priority,
            LocalDateTime dueAt, long version) {}
    private record ReportContext(java.time.LocalDate from, java.time.LocalDate toExclusive, String analysis) {}
}

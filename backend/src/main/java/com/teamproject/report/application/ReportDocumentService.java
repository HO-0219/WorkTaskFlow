package com.teamproject.report.application;

import com.teamproject.dashboard.application.DashboardService;
import com.teamproject.dashboard.application.dto.DashboardDtos.*;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

@Service
public class ReportDocumentService {
    private final DashboardService dashboards;
    public ReportDocumentService(DashboardService dashboards) { this.dashboards = dashboards; }

    public ReportDocument generate(Long userId, Long groupId, LocalDate from, LocalDate to, Language language) {
        GroupDashboardResponse report = dashboards.group(userId, groupId, from, to);
        String html = render(report, language);
        String suffix = language == Language.KO ? "ko" : "en";
        return new ReportDocument(html.getBytes(StandardCharsets.UTF_8),
                "totaskflow-" + groupId + "-" + from + "-" + to.minusDays(1) + "-" + suffix + ".html",
                subject(report.groupName(), from, to, language), html);
    }
    private String render(GroupDashboardResponse value, Language language) {
        boolean ko = language == Language.KO;
        StringBuilder rows = new StringBuilder();
        for (DashboardTaskResponse task : value.periodTasks()) {
            rows.append("<tr><td>").append(escape(task.title())).append("</td><td>")
                    .append(label(task.status(), ko)).append("</td><td>")
                    .append(escape(task.assigneeNickname() == null ? (ko ? "미지정" : "Unassigned") : task.assigneeNickname()))
                    .append("</td><td>").append(task.dueAt() == null ? "-" : task.dueAt().toString().replace('T', ' '))
                    .append("</td></tr>");
        }
        if (rows.isEmpty()) rows.append("<tr><td colspan=\"4\">").append(ko ? "해당 기간 업무가 없습니다." : "No tasks in this period.").append("</td></tr>");
        List<String> insights = insights(value, ko);
        StringBuilder insightHtml = new StringBuilder();
        insights.forEach(text -> insightHtml.append("<li>").append(escape(text)).append("</li>"));
        return """
                <!doctype html><html lang="%s"><head><meta charset="utf-8"><title>%s</title>
                <style>
                @page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,"Noto Sans KR",sans-serif;color:#172033;line-height:1.55;margin:0}
                header{border-bottom:3px solid #2846a6;padding-bottom:18px;margin-bottom:24px}h1{margin:0 0 8px;font-size:28px}h2{font-size:18px;margin-top:28px}
                .meta{color:#5f687a}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metric{border:1px solid #dfe4ee;border-radius:10px;padding:14px}
                .metric small{display:block;color:#687188}.metric strong{font-size:22px}table{width:100%%;border-collapse:collapse;font-size:12px}th,td{padding:9px;border-bottom:1px solid #e5e8ef;text-align:left}
                th{background:#f2f5fb}aside{background:#f6f8fc;border-left:4px solid #2846a6;padding:14px 18px}footer{margin-top:32px;color:#737b89;font-size:11px}
                @media print{button{display:none}}@media(max-width:700px){.metrics{grid-template-columns:repeat(2,1fr)}}
                </style></head><body><header><h1>%s</h1><div class="meta">%s · %s ~ %s</div></header>
                <section class="metrics">
                <div class="metric"><small>%s</small><strong>%d</strong></div>
                <div class="metric"><small>%s</small><strong>%s</strong></div>
                <div class="metric"><small>%s</small><strong>%s</strong></div>
                <div class="metric"><small>%s</small><strong>%d</strong></div>
                </section><h2>%s</h2><aside><ul>%s</ul></aside><h2>%s</h2>
                <table><thead><tr><th>%s</th><th>%s</th><th>%s</th><th>%s</th></tr></thead><tbody>%s</tbody></table>
                <footer>%s</footer></body></html>
                """.formatted(ko ? "ko" : "en", escape(subject(value.groupName(), value.periodFrom(), value.periodTo(), language)),
                escape(value.groupName() + (ko ? " 업무 리포트" : " Work Report")),
                ko ? "보고 기간" : "Reporting period", value.periodFrom(), value.periodTo().minusDays(1),
                ko ? "기간 업무" : "Period tasks", value.periodTasks().size(),
                ko ? "완료율" : "Completion rate", percent(value.periodCompletionRatePercent()),
                ko ? "기한 준수율" : "On-time rate", percent(value.onTimeRatePercent()),
                ko ? "지연 업무" : "Overdue tasks", value.statuses().delayed(),
                ko ? "규칙 기반 요약" : "Rule-based summary", insightHtml,
                ko ? "업무 상세" : "Task details", ko ? "업무" : "Task", ko ? "상태" : "Status",
                ko ? "담당자" : "Assignee", ko ? "마감" : "Due", rows,
                ko ? "이 문서는 ToTaskFlow의 확정 데이터로 생성됐으며 AI 추론을 사용하지 않았습니다."
                        : "Generated from confirmed ToTaskFlow data without AI inference.");
    }
    private List<String> insights(GroupDashboardResponse value, boolean ko) {
        java.util.ArrayList<String> result = new java.util.ArrayList<>();
        if (value.periodTasks().isEmpty()) result.add(ko ? "기간 내 업무가 없어 추세를 판단하지 않습니다." : "There are no tasks in this period, so no trend is inferred.");
        if (value.statuses().delayed() > 0) result.add(ko
                ? "지연 업무 " + value.statuses().delayed() + "건의 마감일과 담당자를 우선 확인하세요."
                : "Review due dates and owners for " + value.statuses().delayed() + " overdue task(s).");
        if (value.statuses().requested() > 0) result.add(ko
                ? "승인 대기 업무 " + value.statuses().requested() + "건이 있어 팀장의 확인이 필요합니다."
                : value.statuses().requested() + " task request(s) need a leader decision.");
        if (value.periodCompletionRatePercent() != null && value.periodCompletionRatePercent() >= 80)
            result.add(ko ? "선택 기간의 신규 업무 완료율이 80% 이상입니다." : "Completion of newly created tasks is at least 80%.");
        if (result.isEmpty()) result.add(ko ? "현재 확정 지표에서 즉시 조치가 필요한 위험 신호는 없습니다." : "Confirmed metrics show no immediate risk signal.");
        return result;
    }
    private String subject(String groupName, LocalDate from, LocalDate to, Language language) {
        return language == Language.KO
                ? "[ToTaskFlow] " + groupName + " 업무 리포트 (" + from + " ~ " + to.minusDays(1) + ")"
                : "[ToTaskFlow] " + groupName + " Work Report (" + from + " – " + to.minusDays(1) + ")";
    }
    private String label(String status, boolean ko) {
        if (!ko) return status.replace('_', ' ');
        return switch (status) {
            case "REQUESTED" -> "승인 대기"; case "TODO" -> "할 일"; case "IN_PROGRESS" -> "진행 중";
            case "ON_HOLD" -> "보류"; case "COMPLETED" -> "완료"; case "REJECTED" -> "반려";
            case "CANCELLED" -> "취소"; default -> status;
        };
    }
    private String percent(Integer value) { return value == null ? "-" : value + "%"; }
    private String escape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
    public enum Language { KO, EN }
    public record ReportDocument(byte[] content, String filename, String subject, String html) {}
}

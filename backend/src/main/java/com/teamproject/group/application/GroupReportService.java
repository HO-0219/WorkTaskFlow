package com.teamproject.group.application;

import com.teamproject.common.exception.ApplicationException;
import com.teamproject.group.application.dto.GroupDtos.ReportAccessResponse;
import com.teamproject.group.domain.Group;
import com.teamproject.group.domain.GroupMember;
import com.teamproject.group.domain.GroupReportDownload;
import com.teamproject.group.domain.GroupReportDownloadRepository;
import com.teamproject.group.domain.GroupRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GroupReportService {
    private final GroupAuthorization authorization;
    private final GroupReportDownloadRepository downloads;
    private final GroupRepository groups;

    public GroupReportService(GroupAuthorization authorization, GroupReportDownloadRepository downloads,
            GroupRepository groups) {
        this.authorization = authorization;
        this.downloads = downloads;
        this.groups = groups;
    }

    @Transactional
    public ReportAccessResponse authorize(Long userId, Long groupId, String rawScope, String rawPeriodType) {
        groups.findByIdForUpdate(groupId).orElseThrow(() ->
                new ApplicationException("GROUP_NOT_FOUND", HttpStatus.NOT_FOUND, "그룹을 찾을 수 없습니다."));
        GroupMember member = authorization.requireActiveMember(groupId, userId);
        Group group = member.getGroup();
        if (group.getType() != Group.Type.TEAM) {
            throw new ApplicationException("PERSONAL_GROUP_RESTRICTED", HttpStatus.BAD_REQUEST,
                    "팀 그룹 리포트만 생성할 수 있습니다.");
        }
        GroupReportDownload.Scope scope = scope(rawScope);
        GroupReportDownload.PeriodType periodType = periodType(rawPeriodType);
        if (scope == GroupReportDownload.Scope.GROUP && member.getRole() != GroupMember.Role.LEADER) {
            throw new ApplicationException("GROUP_LEADER_REQUIRED", HttpStatus.FORBIDDEN,
                    "그룹 전체 리포트는 팀장만 생성할 수 있습니다.");
        }
        downloads.save(new GroupReportDownload(group, member, scope, periodType));

        // PAID 그룹의 OpenAI 분석 및 월 1회 PDF 메일 발송은 별도 리포트 작업에서 연결한다.
        return new ReportAccessResponse(true, group.getMembershipPlan().name(), scope.name(),
                periodType.name(), null);
    }

    private GroupReportDownload.Scope scope(String value) {
        try {
            return GroupReportDownload.Scope.valueOf(value.trim().toUpperCase());
        } catch (RuntimeException exception) {
            throw new ApplicationException("REPORT_SCOPE_INVALID", HttpStatus.BAD_REQUEST,
                    "올바른 리포트 범위를 선택해 주세요.");
        }
    }

    private GroupReportDownload.PeriodType periodType(String value) {
        try {
            return GroupReportDownload.PeriodType.valueOf(value.trim().toUpperCase());
        } catch (RuntimeException exception) {
            throw new ApplicationException("REPORT_PERIOD_INVALID", HttpStatus.BAD_REQUEST,
                    "올바른 리포트 기간을 선택해 주세요.");
        }
    }
}

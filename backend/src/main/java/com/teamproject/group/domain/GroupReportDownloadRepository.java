package com.teamproject.group.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;

public interface GroupReportDownloadRepository extends JpaRepository<GroupReportDownload, Long> {
    long countByGroupIdAndScopeAndCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            Long groupId, GroupReportDownload.Scope scope, LocalDateTime from, LocalDateTime to);
}

package com.teamproject.task.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.time.LocalDateTime;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findAllByGroupIdOrderByCreatedAtDesc(Long groupId);
    List<Task> findAllByGroupIdAndDueAtGreaterThanEqualAndDueAtLessThanOrderByDueAtAscIdAsc(
            Long groupId, LocalDateTime from, LocalDateTime to);
    List<Task> findAllByAssigneeUserIdAndAssigneeStatus(Long userId,
            com.teamproject.group.domain.GroupMember.Status status);
}

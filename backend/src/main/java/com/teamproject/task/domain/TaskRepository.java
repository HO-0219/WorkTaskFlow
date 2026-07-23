package com.teamproject.task.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Collection;
import java.util.List;
import java.time.LocalDateTime;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findAllByGroupIdOrderByCreatedAtDesc(Long groupId);
    List<Task> findAllByGroupIdAndDueAtGreaterThanEqualAndDueAtLessThanOrderByDueAtAscIdAsc(
            Long groupId, LocalDateTime from, LocalDateTime to);
    List<Task> findAllByAssigneeUserIdAndAssigneeStatus(Long userId,
            com.teamproject.group.domain.GroupMember.Status status);
    @Query("select t from Task t where t.dueAt is not null and t.status in :statuses")
    List<Task> findAllWithDueAtAndStatusIn(Collection<Task.Status> statuses);
}

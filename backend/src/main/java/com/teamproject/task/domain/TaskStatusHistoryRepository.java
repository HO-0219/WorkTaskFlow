package com.teamproject.task.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TaskStatusHistoryRepository extends JpaRepository<TaskStatusHistory, Long> {
    List<TaskStatusHistory> findAllByTaskIdOrderByCreatedAtAsc(Long taskId);
}

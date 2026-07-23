package com.teamproject.notification.application;

import com.teamproject.task.domain.Task;
import com.teamproject.task.domain.TaskRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.EnumSet;

@Component
public class TaskReminderScheduler {
    private static final EnumSet<Task.Status> ACTIVE_STATUSES = EnumSet.of(
            Task.Status.REQUESTED, Task.Status.TODO, Task.Status.IN_PROGRESS, Task.Status.ON_HOLD);
    private final TaskRepository tasks;
    private final NotificationService notifications;

    public TaskReminderScheduler(TaskRepository tasks, NotificationService notifications) {
        this.tasks = tasks;
        this.notifications = notifications;
    }

    @Scheduled(cron = "${app.notification.due-soon-cron:0 */15 * * * *}", zone = "UTC")
    @Transactional
    public void sendDueSoonNotifications() {
        tasks.findAllWithDueAtAndStatusIn(ACTIVE_STATUSES).forEach(task -> {
            LocalDateTime now = LocalDateTime.now(ZoneId.of(task.getGroup().getTimezone()));
            if (task.getDueAt().isBefore(now) || task.getDueAt().isAfter(now.plusHours(24))) return;
            long seconds = Duration.between(now, task.getDueAt()).getSeconds();
            long remainingHours = Math.max(1, (seconds + 3599) / 3600);
            notifications.taskDueSoon(task, remainingHours);
        });
    }
}

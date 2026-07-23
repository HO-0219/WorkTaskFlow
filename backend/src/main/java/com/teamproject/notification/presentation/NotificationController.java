package com.teamproject.notification.presentation;

import com.teamproject.notification.application.NotificationService;
import com.teamproject.notification.application.dto.NotificationDtos.NotificationPageResponse;
import com.teamproject.notification.application.dto.NotificationDtos.NotificationResponse;
import com.teamproject.notification.application.dto.NotificationDtos.ReadAllResponse;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService notifications;
    public NotificationController(NotificationService notifications) { this.notifications = notifications; }

    @GetMapping
    NotificationPageResponse list(Authentication authentication,
            @RequestParam(required = false) Long cursor,
            @RequestParam(defaultValue = "20") int size) {
        return notifications.list((Long) authentication.getPrincipal(), cursor, size);
    }

    @PatchMapping("/{notificationId}/read")
    NotificationResponse read(Authentication authentication, @PathVariable Long notificationId) {
        return notifications.read((Long) authentication.getPrincipal(), notificationId);
    }

    @PatchMapping("/read-all")
    ReadAllResponse readAll(Authentication authentication) {
        return notifications.readAll((Long) authentication.getPrincipal());
    }

    @DeleteMapping("/{notificationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(Authentication authentication, @PathVariable Long notificationId) {
        notifications.delete((Long) authentication.getPrincipal(), notificationId);
    }
}

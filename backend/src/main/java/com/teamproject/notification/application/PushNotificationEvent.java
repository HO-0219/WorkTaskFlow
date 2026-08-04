package com.teamproject.notification.application;

public record PushNotificationEvent(
        Long userId, String title, String message, String targetUrl, String tag) {}

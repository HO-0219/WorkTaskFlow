package com.teamproject.notification.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.teamproject.notification.domain.PushSubscription;
import com.teamproject.notification.domain.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.Security;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
public class WebPushDeliveryService {
    private static final Logger log = LoggerFactory.getLogger(WebPushDeliveryService.class);
    private final PushSubscriptionRepository subscriptions;
    private final ObjectMapper objectMapper;
    private final String publicKey;
    private final String privateKey;
    private final String subject;
    private PushService pushService;

    public WebPushDeliveryService(PushSubscriptionRepository subscriptions, ObjectMapper objectMapper,
            @Value("${app.notification.push.public-key:}") String publicKey,
            @Value("${app.notification.push.private-key:}") String privateKey,
            @Value("${app.notification.push.subject:mailto:no-reply@totaskflow.local}") String subject) {
        this.subscriptions = subscriptions;
        this.objectMapper = objectMapper;
        this.publicKey = publicKey.trim();
        this.privateKey = privateKey.trim();
        this.subject = subject.trim();
    }

    @PostConstruct
    void initialize() {
        if (publicKey.isBlank() || privateKey.isBlank()) return;
        try {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(new BouncyCastleProvider());
            }
            pushService = new PushService(publicKey, privateKey, subject);
        } catch (Exception exception) {
            throw new IllegalStateException("Invalid VAPID Web Push configuration", exception);
        }
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void deliver(PushNotificationEvent event) {
        if (pushService == null) return;
        byte[] payload;
        try {
            payload = objectMapper.writeValueAsString(new Payload(
                    event.title(), event.message(), event.targetUrl(), event.tag()))
                    .getBytes(StandardCharsets.UTF_8);
        } catch (JsonProcessingException exception) {
            log.warn("Could not serialize Web Push payload for user {}", event.userId(), exception);
            return;
        }
        for (PushSubscription subscription : subscriptions.findAllByUserId(event.userId())) {
            send(subscription, payload);
        }
    }

    private void send(PushSubscription subscription, byte[] payload) {
        try {
            var response = pushService.send(new Notification(subscription.getEndpoint(),
                    subscription.getP256dhKey(), subscription.getAuthSecret(), payload));
            int status = response.getStatusLine().getStatusCode();
            if (status == 404 || status == 410) subscriptions.deleteById(subscription.getId());
            else if (status < 200 || status >= 300) {
                log.warn("Web Push provider returned status {} for subscription {}", status, subscription.getId());
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        } catch (Exception exception) {
            log.warn("Web Push delivery failed for subscription {}", subscription.getId(), exception);
        }
    }

    private record Payload(String title, String body, String url, String tag) {}
}

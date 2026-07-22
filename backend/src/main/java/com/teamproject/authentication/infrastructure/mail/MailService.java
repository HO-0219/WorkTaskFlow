package com.teamproject.authentication.infrastructure.mail;

import org.slf4j.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private final JavaMailSender sender;
    private final String from;
    private final boolean enabled;
    public MailService(JavaMailSender sender, @Value("${app.mail.from}") String from, @Value("${app.mail.enabled}") boolean enabled) {
        this.sender = sender;
        this.from = from;
        this.enabled = enabled;
    }
    public void sendBestEffort(String to, String subject, String body) {
        if (!enabled) {
            log.info("[LOCAL MAIL] to={} subject={} body={}", to, subject, body);
            return;
        }
        var message = new SimpleMailMessage();
        message.setFrom(from); message.setTo(to); message.setSubject(subject); message.setText(body);
        try {
            sender.send(message);
        } catch (RuntimeException exception) {
            log.error("Mail delivery failed. recipient={} subject={} error={} message={}",
                    maskRecipient(to), subject, exception.getClass().getSimpleName(), exception.getMessage());
            log.debug("Mail delivery failure detail", exception);
        }
    }

    private String maskRecipient(String recipient) {
        int at = recipient.indexOf('@');
        if (at <= 0) return "***";
        return recipient.charAt(0) + "***" + recipient.substring(at);
    }
}

package com.teamproject.auth.service;

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
    public void send(String to, String subject, String body) {
        if (!enabled) {
            log.info("[LOCAL MAIL] to={} subject={} body={}", to, subject, body);
            return;
        }
        var message = new SimpleMailMessage();
        message.setFrom(from); message.setTo(to); message.setSubject(subject); message.setText(body);
        sender.send(message);
    }
}


package com.teamproject.notification.domain;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDateTime;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Slice<Notification> findByRecipientIdOrderByIdDesc(Long recipientId, Pageable pageable);
    Slice<Notification> findByRecipientIdAndIdLessThanOrderByIdDesc(Long recipientId, Long id, Pageable pageable);
    Slice<Notification> findByRecipientIdAndReadAtIsNullOrderByIdDesc(Long recipientId, Pageable pageable);
    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);
    long countByRecipientIdAndReadAtIsNull(Long recipientId);
    boolean existsByRecipientIdAndEventKey(Long recipientId, String eventKey);

    @Modifying(clearAutomatically = true)
    @Query("update Notification n set n.readAt = :readAt where n.recipient.id = :recipientId and n.readAt is null")
    int markAllRead(Long recipientId, LocalDateTime readAt);
}

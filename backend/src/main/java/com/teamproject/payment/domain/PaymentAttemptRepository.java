package com.teamproject.payment.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PaymentAttemptRepository extends JpaRepository<PaymentAttempt, Long> {
    List<PaymentAttempt> findAllByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<PaymentAttempt> findByIdAndUserId(Long id, Long userId);
}

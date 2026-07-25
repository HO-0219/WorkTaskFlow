package com.teamproject.user.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserConsentRepository extends JpaRepository<UserConsent, Long> {
    List<UserConsent> findAllByUserId(Long userId);
}

package com.teamproject.authentication.domain.token;

import com.teamproject.user.domain.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_tokens", indexes = @Index(name = "idx_refresh_hash", columnList = "token_hash", unique = true))
public class RefreshToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;
    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;
    @Column(nullable = false)
    private LocalDateTime expiresAt;
    private LocalDateTime revokedAt;

    protected RefreshToken() {}
    public RefreshToken(User user, String tokenHash, LocalDateTime expiresAt) {
        this.user = user;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }
    public boolean isValid(LocalDateTime now) { return revokedAt == null && expiresAt.isAfter(now); }
    public void revoke() { revokedAt = LocalDateTime.now(); }
    public User getUser() { return user; }
}

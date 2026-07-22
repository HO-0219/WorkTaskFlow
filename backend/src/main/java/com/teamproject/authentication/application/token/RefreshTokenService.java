package com.teamproject.authentication.application.token;

import com.teamproject.authentication.domain.token.RefreshToken;
import com.teamproject.authentication.domain.token.RefreshTokenRepository;
import com.teamproject.authentication.infrastructure.crypto.HashService;
import com.teamproject.common.exception.ApplicationException;
import com.teamproject.user.domain.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class RefreshTokenService {
    private final SecureRandom random = new SecureRandom();
    private final RefreshTokenRepository repository;
    private final HashService hashService;
    private final long refreshSeconds;
    public RefreshTokenService(RefreshTokenRepository repository, HashService hashService, @Value("${app.jwt.refresh-seconds}") long refreshSeconds) {
        this.repository = repository; this.hashService = hashService; this.refreshSeconds = refreshSeconds;
    }
    @Transactional public String issue(User user) {
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(random.generateSeed(48));
        repository.save(new RefreshToken(user, hashService.sha256(raw), LocalDateTime.now().plusSeconds(refreshSeconds)));
        return raw;
    }
    @Transactional public User rotate(String raw) {
        RefreshToken token = find(raw);
        if (!token.isValid(LocalDateTime.now())) throw invalid();
        token.revoke();
        return token.getUser();
    }
    @Transactional public void revoke(String raw) { if (raw != null) repository.findByTokenHash(hashService.sha256(raw)).ifPresent(RefreshToken::revoke); }
    private RefreshToken find(String raw) {
        if (raw == null || raw.isBlank()) throw invalid();
        return repository.findByTokenHash(hashService.sha256(raw)).orElseThrow(this::invalid);
    }
    private ApplicationException invalid() { return new ApplicationException("REFRESH_TOKEN_INVALID", HttpStatus.UNAUTHORIZED, "로그인이 만료되었습니다."); }
    public long refreshSeconds() { return refreshSeconds; }
}

package com.teamproject.authentication.application;

import com.teamproject.authentication.application.dto.SessionDtos.LoginRequest;
import com.teamproject.authentication.application.dto.SessionDtos.MeResponse;
import com.teamproject.authentication.application.token.RefreshTokenService;
import com.teamproject.common.exception.ApplicationException;
import com.teamproject.user.domain.User;
import com.teamproject.user.domain.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokens;
    private final AccessSessionIssuer issuer;

    public SessionService(UserRepository users, PasswordEncoder passwordEncoder,
            RefreshTokenService refreshTokens, AccessSessionIssuer issuer) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokens = refreshTokens;
        this.issuer = issuer;
    }

    @Transactional
    public IssuedTokens login(LoginRequest request) {
        User user = users.findByUsernameIgnoreCase(request.username().trim()).orElseThrow(this::credentials);
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw credentials();
        }
        user.recordLogin();
        return issuer.issue(user);
    }

    @Transactional
    public IssuedTokens refresh(String raw) { return issuer.issue(refreshTokens.rotate(raw)); }

    @Transactional
    public void logout(String raw) { refreshTokens.revoke(raw); }

    @Transactional(readOnly = true)
    public MeResponse me(Long id) {
        User user = users.findById(id).orElseThrow(() ->
                new ApplicationException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        return new MeResponse(user.getId(), user.getUsername(), user.getEmail(), user.getName(),
                user.getSystemRole().name());
    }

    private ApplicationException credentials() {
        return new ApplicationException("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED,
                "아이디 또는 비밀번호가 올바르지 않습니다.");
    }
}

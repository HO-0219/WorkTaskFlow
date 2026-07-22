package com.teamproject.authentication.presentation;

import com.teamproject.authentication.application.SessionService;
import com.teamproject.authentication.application.dto.SessionDtos.LoginRequest;
import com.teamproject.authentication.application.dto.SessionDtos.MeResponse;
import com.teamproject.authentication.application.dto.SessionDtos.TokenResponse;
import com.teamproject.authentication.infrastructure.web.RefreshCookieService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class SessionController {
    private final SessionService sessions;
    private final RefreshCookieService cookies;
    public SessionController(SessionService sessions, RefreshCookieService cookies) {
        this.sessions = sessions;
        this.cookies = cookies;
    }
    @PostMapping("/login")
    TokenResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        var tokens = sessions.login(request);
        cookies.add(response, tokens.refreshToken());
        return tokens.response();
    }
    @PostMapping("/refresh")
    TokenResponse refresh(@CookieValue(name = RefreshCookieService.NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        var tokens = sessions.refresh(refreshToken);
        cookies.add(response, tokens.refreshToken());
        return tokens.response();
    }
    @PostMapping("/logout")
    ResponseEntity<Void> logout(@CookieValue(name = RefreshCookieService.NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        sessions.logout(refreshToken);
        cookies.clear(response);
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/me")
    MeResponse me(Authentication authentication) { return sessions.me((Long) authentication.getPrincipal()); }
}

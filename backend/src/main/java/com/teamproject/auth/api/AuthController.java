package com.teamproject.auth.api;

import com.teamproject.auth.api.AuthDtos.*;
import com.teamproject.auth.security.RefreshCookieService;
import com.teamproject.auth.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService auth;
    private final RefreshCookieService cookies;
    private final boolean google;
    private final boolean kakao;
    public AuthController(AuthService auth, RefreshCookieService cookies,
            @Value("${spring.security.oauth2.client.registration.google.client-id}") String googleClientId,
            @Value("${spring.security.oauth2.client.registration.kakao.client-id}") String kakaoClientId) {
        this.auth = auth; this.cookies = cookies;
        this.google = !"disabled".equals(googleClientId); this.kakao = !"disabled".equals(kakaoClientId);
    }
    @PostMapping("/email-verifications") ResponseEntity<Void> sendVerification(@Valid @RequestBody EmailRequest request) {
        auth.sendVerification(request.email()); return ResponseEntity.noContent().build();
    }
    @PostMapping("/email-verifications/confirm") ResponseEntity<Void> confirm(@Valid @RequestBody VerificationConfirmRequest request) {
        auth.verifyCode(request.email(), request.code()); return ResponseEntity.noContent().build();
    }
    @PostMapping("/signup") SignupResponse signup(@Valid @RequestBody SignupRequest request) { return auth.signup(request); }
    @PostMapping("/login") TokenResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        var tokens = auth.login(request); cookies.add(response, tokens.refreshToken()); return tokens.response();
    }
    @PostMapping("/refresh") TokenResponse refresh(@CookieValue(name = RefreshCookieService.NAME, required = false) String refreshToken, HttpServletResponse response) {
        var tokens = auth.refresh(refreshToken); cookies.add(response, tokens.refreshToken()); return tokens.response();
    }
    @PostMapping("/logout") ResponseEntity<Void> logout(@CookieValue(name = RefreshCookieService.NAME, required = false) String refreshToken, HttpServletResponse response) {
        auth.logout(refreshToken); cookies.clear(response); return ResponseEntity.noContent().build();
    }
    @PostMapping("/username-reminders") ResponseEntity<Void> remindUsername(@Valid @RequestBody EmailRequest request) {
        auth.remindUsername(request.email()); return ResponseEntity.noContent().build();
    }
    @PostMapping("/password-resets") ResponseEntity<Void> requestReset(@Valid @RequestBody PasswordResetRequest request) {
        auth.requestPasswordReset(request.email()); return ResponseEntity.noContent().build();
    }
    @PostMapping("/password-resets/confirm") ResponseEntity<Void> reset(@Valid @RequestBody PasswordResetConfirmRequest request) {
        auth.resetPassword(request); return ResponseEntity.noContent().build();
    }
    @GetMapping("/providers") ProviderResponse providers() { return new ProviderResponse(google, kakao); }
    @GetMapping("/me") MeResponse me(Authentication authentication) { return auth.me((Long) authentication.getPrincipal()); }
}


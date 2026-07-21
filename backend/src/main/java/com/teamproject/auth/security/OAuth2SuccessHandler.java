package com.teamproject.auth.security;

import com.teamproject.auth.service.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.Map;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {
    private final AuthService authService;
    private final RefreshCookieService cookies;
    private final String frontendUrl;
    public OAuth2SuccessHandler(AuthService authService, RefreshCookieService cookies, @Value("${app.frontend-url}") String frontendUrl) {
        this.authService = authService; this.cookies = cookies; this.frontendUrl = frontendUrl;
    }
    @Override public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        var oauth = (OAuth2AuthenticationToken) authentication;
        OAuth2User principal = oauth.getPrincipal();
        String provider = oauth.getAuthorizedClientRegistrationId();
        Profile profile = profile(provider, principal.getAttributes());
        try {
            var tokens = authService.socialLogin(provider, profile.subject(), profile.email(), profile.name());
            cookies.add(response, tokens.refreshToken());
            response.sendRedirect(frontendUrl + "/oauth/callback");
        } catch (RuntimeException e) {
            response.sendRedirect(frontendUrl + "/login?socialError=SOCIAL_LOGIN_FAILED");
        }
    }
    @SuppressWarnings("unchecked")
    private Profile profile(String provider, Map<String, Object> attributes) {
        if ("kakao".equals(provider)) {
            Map<String, Object> account = (Map<String, Object>) attributes.getOrDefault("kakao_account", Map.of());
            Map<String, Object> kakaoProfile = (Map<String, Object>) account.getOrDefault("profile", Map.of());
            return new Profile(String.valueOf(attributes.get("id")), (String) account.get("email"), (String) kakaoProfile.get("nickname"));
        }
        return new Profile(String.valueOf(attributes.get("sub")), (String) attributes.get("email"), (String) attributes.get("name"));
    }
    private record Profile(String subject, String email, String name) {}
}


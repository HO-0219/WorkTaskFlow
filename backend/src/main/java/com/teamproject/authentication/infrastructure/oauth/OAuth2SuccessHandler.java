package com.teamproject.authentication.infrastructure.oauth;

import com.teamproject.authentication.application.OAuthLoginService;
import com.teamproject.authentication.infrastructure.web.RefreshCookieService;
import com.teamproject.authentication.infrastructure.web.OAuthSignupCookieService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.util.Map;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {
    private final OAuthLoginService oauthLogin;
    private final RefreshCookieService cookies;
    private final OAuthSignupCookieService signupCookies;
    private final OAuth2AuthorizedClientService authorizedClients;
    private final String frontendUrl;
    public OAuth2SuccessHandler(OAuthLoginService oauthLogin, RefreshCookieService cookies,
            OAuthSignupCookieService signupCookies, OAuth2AuthorizedClientService authorizedClients,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.oauthLogin = oauthLogin; this.cookies = cookies; this.signupCookies = signupCookies;
        this.authorizedClients = authorizedClients; this.frontendUrl = frontendUrl;
    }
    @Override public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {
        var oauth = (OAuth2AuthenticationToken) authentication;
        OAuth2User principal = oauth.getPrincipal();
        String provider = oauth.getAuthorizedClientRegistrationId();
        try {
            Profile profile = profile(provider, principal.getAttributes());
            var result = oauthLogin.start(provider, profile.subject(), profile.email(), profile.name(), profile.emailVerified());
            if (result.requiresConsent()) {
                signupCookies.add(response, result.signupToken());
                response.sendRedirect(frontendUrl + "/oauth/consent");
            } else {
                cookies.add(response, result.tokens().refreshToken());
                response.sendRedirect(frontendUrl + "/oauth/callback");
            }
        } catch (RuntimeException e) {
            response.sendRedirect(frontendUrl + "/login?socialError=SOCIAL_LOGIN_FAILED");
        } finally {
            authorizedClients.removeAuthorizedClient(provider, oauth.getName());
        }
    }
    @SuppressWarnings("unchecked")
    private Profile profile(String provider, Map<String, Object> attributes) {
        if ("kakao".equals(provider)) {
            Map<String, Object> account = (Map<String, Object>) attributes.getOrDefault("kakao_account", Map.of());
            Map<String, Object> kakaoProfile = (Map<String, Object>) account.getOrDefault("profile", Map.of());
            return new Profile(String.valueOf(attributes.get("id")), (String) account.get("email"),
                    (String) kakaoProfile.get("nickname"), Boolean.TRUE.equals(account.get("is_email_verified")));
        }
        return new Profile(String.valueOf(attributes.get("sub")), (String) attributes.get("email"),
                (String) attributes.get("name"), Boolean.TRUE.equals(attributes.get("email_verified")));
    }
    private record Profile(String subject, String email, String name, boolean emailVerified) {}
}

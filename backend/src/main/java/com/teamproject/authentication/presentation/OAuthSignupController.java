package com.teamproject.authentication.presentation;

import com.teamproject.authentication.application.OAuthLoginService;
import com.teamproject.authentication.application.dto.OAuthDtos.SignupCompleteRequest;
import com.teamproject.authentication.application.dto.OAuthDtos.SignupStatusResponse;
import com.teamproject.authentication.application.dto.SessionDtos.TokenResponse;
import com.teamproject.authentication.infrastructure.web.OAuthSignupCookieService;
import com.teamproject.authentication.infrastructure.web.RefreshCookieService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/oauth-signup")
public class OAuthSignupController {
    private final OAuthLoginService oauth;
    private final OAuthSignupCookieService signupCookies;
    private final RefreshCookieService refreshCookies;

    public OAuthSignupController(OAuthLoginService oauth, OAuthSignupCookieService signupCookies,
            RefreshCookieService refreshCookies) {
        this.oauth = oauth;
        this.signupCookies = signupCookies;
        this.refreshCookies = refreshCookies;
    }

    @GetMapping
    SignupStatusResponse status(
            @CookieValue(name = OAuthSignupCookieService.NAME, required = false) String signupToken) {
        return oauth.status(signupToken);
    }

    @PostMapping("/complete")
    TokenResponse complete(
            @CookieValue(name = OAuthSignupCookieService.NAME, required = false) String signupToken,
            @Valid @RequestBody SignupCompleteRequest request, HttpServletResponse response) {
        var tokens = oauth.complete(signupToken, request);
        signupCookies.clear(response);
        refreshCookies.add(response, tokens.refreshToken());
        return tokens.response();
    }

    @DeleteMapping
    ResponseEntity<Void> cancel(
            @CookieValue(name = OAuthSignupCookieService.NAME, required = false) String signupToken,
            HttpServletResponse response) {
        oauth.cancel(signupToken);
        signupCookies.clear(response);
        return ResponseEntity.noContent().build();
    }
}

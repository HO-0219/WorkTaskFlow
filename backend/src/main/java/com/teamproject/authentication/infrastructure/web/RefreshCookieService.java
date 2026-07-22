package com.teamproject.authentication.infrastructure.web;

import com.teamproject.authentication.application.token.RefreshTokenService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;

@Component
public class RefreshCookieService {
    public static final String NAME = "team_refresh_token";
    private final boolean secure;
    private final RefreshTokenService tokens;
    public RefreshCookieService(@Value("${app.jwt.secure-cookie}") boolean secure, RefreshTokenService tokens) {
        this.secure = secure; this.tokens = tokens;
    }
    public void add(HttpServletResponse response, String value) { response.addHeader(HttpHeaders.SET_COOKIE, cookie(value, tokens.refreshSeconds()).toString()); }
    public void clear(HttpServletResponse response) { response.addHeader(HttpHeaders.SET_COOKIE, cookie("", 0).toString()); }
    private ResponseCookie cookie(String value, long age) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(secure).sameSite("Lax").path("/api/v1/auth").maxAge(age).build();
    }
}

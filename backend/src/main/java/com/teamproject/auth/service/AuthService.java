package com.teamproject.auth.service;

import com.teamproject.auth.api.AuthDtos.*;
import com.teamproject.auth.api.AuthException;
import com.teamproject.auth.security.JwtService;
import com.teamproject.auth.user.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class AuthService {
    public record IssuedTokens(TokenResponse response, String refreshToken) {}
    private final UserRepository users;
    private final SocialAccountRepository socialAccounts;
    private final PasswordEncoder passwordEncoder;
    private final OneTimeTokenService oneTimeTokens;
    private final RefreshTokenService refreshTokens;
    private final JwtService jwt;
    private final MailService mail;
    private final String frontendUrl;

    public AuthService(UserRepository users, SocialAccountRepository socialAccounts, PasswordEncoder passwordEncoder,
            OneTimeTokenService oneTimeTokens, RefreshTokenService refreshTokens, JwtService jwt, MailService mail,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.users = users; this.socialAccounts = socialAccounts; this.passwordEncoder = passwordEncoder;
        this.oneTimeTokens = oneTimeTokens; this.refreshTokens = refreshTokens; this.jwt = jwt; this.mail = mail; this.frontendUrl = frontendUrl;
    }
    @Transactional public SignupResponse signup(SignupRequest request) {
        String username = request.username().trim().toLowerCase(Locale.ROOT);
        String email = normalizeEmail(request.email());
        if (users.existsByUsernameIgnoreCase(username)) throw conflict("USERNAME_EXISTS", "이미 사용 중인 아이디입니다.");
        if (users.existsByEmailIgnoreCase(email)) throw conflict("EMAIL_EXISTS", "이미 가입된 이메일입니다.");
        oneTimeTokens.consumeCode(email, request.verificationCode());
        User user = users.save(new User(username, email, passwordEncoder.encode(request.password()), request.name().trim(), true));
        return new SignupResponse(user.getId(), user.getUsername(), user.getEmail(), user.getName());
    }
    @Transactional public IssuedTokens login(LoginRequest request) {
        User user = users.findByUsernameIgnoreCase(request.username().trim()).orElseThrow(this::credentials);
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) throw credentials();
        user.recordLogin();
        return issue(user);
    }
    @Transactional public IssuedTokens refresh(String raw) {
        User user = refreshTokens.rotate(raw);
        return issue(user);
    }
    @Transactional public void logout(String raw) { refreshTokens.revoke(raw); }
    @Transactional(readOnly = true) public MeResponse me(Long id) {
        User user = users.findById(id).orElseThrow(() -> new AuthException("USER_NOT_FOUND", HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        return new MeResponse(user.getId(), user.getUsername(), user.getEmail(), user.getName(), user.getRole().name());
    }
    @Transactional public void sendVerification(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        if (users.existsByEmailIgnoreCase(email)) throw conflict("EMAIL_EXISTS", "이미 가입된 이메일입니다.");
        String code = oneTimeTokens.issueCode(email);
        mail.send(email, "[Team Project] 이메일 인증번호", "인증번호: " + code + "\n10분 안에 입력해 주세요.");
    }
    @Transactional(readOnly = true) public void verifyCode(String email, String code) { oneTimeTokens.verifyCode(normalizeEmail(email), code); }
    @Transactional(readOnly = true) public void remindUsername(String rawEmail) {
        users.findByEmailIgnoreCase(normalizeEmail(rawEmail)).ifPresent(user ->
                mail.send(user.getEmail(), "[Team Project] 아이디 안내", "회원님의 아이디는 " + user.getUsername() + " 입니다."));
    }
    @Transactional public void requestPasswordReset(String rawEmail) {
        users.findByEmailIgnoreCase(normalizeEmail(rawEmail)).ifPresent(user -> {
            String token = oneTimeTokens.issueResetToken(user.getEmail());
            mail.send(user.getEmail(), "[Team Project] 비밀번호 재설정", frontendUrl + "/reset-password?email=" + user.getEmail() + "&token=" + token);
        });
    }
    @Transactional public void resetPassword(PasswordResetConfirmRequest request) {
        String email = normalizeEmail(request.email());
        User user = users.findByEmailIgnoreCase(email).orElseThrow(() -> new AuthException("TOKEN_INVALID", HttpStatus.BAD_REQUEST, "재설정 정보가 올바르지 않습니다."));
        oneTimeTokens.consumeResetToken(email, request.token());
        user.changePassword(passwordEncoder.encode(request.newPassword()));
    }
    @Transactional public IssuedTokens socialLogin(String provider, String subject, String rawEmail, String name) {
        return socialAccounts.findByProviderAndProviderSubject(provider, subject).map(SocialAccount::getUser).map(this::issue)
                .orElseGet(() -> {
                    if (rawEmail == null || rawEmail.isBlank()) {
                        throw new AuthException("SOCIAL_EMAIL_REQUIRED", HttpStatus.BAD_REQUEST, "소셜 계정의 이메일 제공 동의가 필요합니다.");
                    }
                    String email = normalizeEmail(rawEmail);
                    if (users.existsByEmailIgnoreCase(email)) {
                        throw new AuthException("SOCIAL_ACCOUNT_LINK_REQUIRED", HttpStatus.CONFLICT, "같은 이메일의 기존 계정이 있습니다. 로그인 후 계정 연결이 필요합니다.");
                    }
                    User user = users.save(User.social(availableUsername(email), email, cleanName(name)));
                    socialAccounts.save(new SocialAccount(user, provider, subject));
                    user.recordLogin();
                    return issue(user);
                });
    }
    private IssuedTokens issue(User user) { return new IssuedTokens(new TokenResponse(jwt.create(user), "Bearer", jwt.accessSeconds()), refreshTokens.issue(user)); }
    private String availableUsername(String email) {
        String base = email.substring(0, email.indexOf('@')).replaceAll("[^a-zA-Z0-9_]", "");
        if (base.length() < 4) base = "user" + base;
        if (base.length() > 16) base = base.substring(0, 16);
        String candidate = base.toLowerCase(Locale.ROOT); int suffix = 1;
        while (users.existsByUsernameIgnoreCase(candidate)) candidate = base + suffix++;
        return candidate;
    }
    private String cleanName(String name) { return name == null || name.isBlank() ? "사용자" : name.trim(); }
    private String normalizeEmail(String email) { return email.trim().toLowerCase(Locale.ROOT); }
    private AuthException credentials() { return new AuthException("INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."); }
    private AuthException conflict(String code, String message) { return new AuthException(code, HttpStatus.CONFLICT, message); }
}

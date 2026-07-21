package com.teamproject.auth;

import com.teamproject.auth.api.AuthDtos.*;
import com.teamproject.auth.service.*;
import com.teamproject.auth.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
class AuthFlowTest {
    @Autowired AuthService auth;
    @Autowired OneTimeTokenService oneTimeTokens;
    @Autowired UserRepository users;

    @Test
    void signupLoginRefreshAndPasswordReset() {
        String email = "member@example.com";
        String code = oneTimeTokens.issueCode(email);

        SignupResponse signup = auth.signup(new SignupRequest("team_member", email, "팀원", "password123!", code));
        assertThat(signup.username()).isEqualTo("team_member");
        assertThat(users.existsByEmailIgnoreCase(email)).isTrue();

        AuthService.IssuedTokens login = auth.login(new LoginRequest("team_member", "password123!"));
        assertThat(login.response().accessToken()).isNotBlank();
        assertThat(auth.refresh(login.refreshToken()).response().accessToken()).isNotBlank();

        String resetToken = oneTimeTokens.issueResetToken(email);
        auth.resetPassword(new PasswordResetConfirmRequest(email, resetToken, "changedPassword123!"));
        assertThat(auth.login(new LoginRequest("team_member", "changedPassword123!")).response().accessToken()).isNotBlank();
    }
}

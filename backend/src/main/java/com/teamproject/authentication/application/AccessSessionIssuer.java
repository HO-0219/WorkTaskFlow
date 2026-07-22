package com.teamproject.authentication.application;

import com.teamproject.authentication.application.dto.SessionDtos.TokenResponse;
import com.teamproject.authentication.application.token.RefreshTokenService;
import com.teamproject.common.exception.ApplicationException;
import com.teamproject.jwt.JwtService;
import com.teamproject.user.domain.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class AccessSessionIssuer {
    private final JwtService jwt;
    private final RefreshTokenService refreshTokens;

    public AccessSessionIssuer(JwtService jwt, RefreshTokenService refreshTokens) {
        this.jwt = jwt;
        this.refreshTokens = refreshTokens;
    }

    public IssuedTokens issue(User user) {
        if (!user.isActive()) {
            throw new ApplicationException("ACCOUNT_INACTIVE", HttpStatus.FORBIDDEN, "사용할 수 없는 계정입니다.");
        }
        return new IssuedTokens(
                new TokenResponse(jwt.create(user), "Bearer", jwt.accessSeconds()),
                refreshTokens.issue(user));
    }
}

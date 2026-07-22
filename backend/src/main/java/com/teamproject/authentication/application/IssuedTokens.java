package com.teamproject.authentication.application;

import com.teamproject.authentication.application.dto.SessionDtos.TokenResponse;

public record IssuedTokens(TokenResponse response, String refreshToken) {
    @Override public String toString() { return "IssuedTokens[response=" + response + ", refreshToken=redacted]"; }
}

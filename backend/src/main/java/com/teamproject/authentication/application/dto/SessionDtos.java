package com.teamproject.authentication.application.dto;

import jakarta.validation.constraints.NotBlank;

public final class SessionDtos {
    private SessionDtos() {}

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
        @Override public String toString() { return "LoginRequest[redacted]"; }
    }
    public record TokenResponse(String accessToken, String tokenType, long expiresIn) {
        @Override public String toString() {
            return "TokenResponse[tokenType=" + tokenType + ", expiresIn=" + expiresIn + "]";
        }
    }
    public record MeResponse(Long userId, String username, String email, String name, String role) {
        @Override public String toString() { return "MeResponse[userId=" + userId + ", role=" + role + "]"; }
    }
}

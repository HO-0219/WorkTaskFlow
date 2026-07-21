package com.teamproject.auth.api;

import jakarta.validation.constraints.*;

public final class AuthDtos {
    private AuthDtos() {}

    public record EmailRequest(@NotBlank @Email String email) {}
    public record VerificationConfirmRequest(@NotBlank @Email String email, @Pattern(regexp = "\\d{6}") String code) {}
    public record SignupRequest(
            @NotBlank @Pattern(regexp = "^[a-zA-Z0-9_]{4,20}$") String username,
            @NotBlank @Email String email,
            @NotBlank @Size(min = 2, max = 60) String name,
            @NotBlank @Size(min = 8, max = 72) String password,
            @Pattern(regexp = "\\d{6}") String verificationCode
    ) {}
    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
    public record PasswordResetRequest(@NotBlank @Email String email) {}
    public record PasswordResetConfirmRequest(
            @NotBlank @Email String email,
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 72) String newPassword
    ) {}
    public record TokenResponse(String accessToken, String tokenType, long expiresIn) {}
    public record SignupResponse(Long userId, String username, String email, String name) {}
    public record MeResponse(Long userId, String username, String email, String name, String role) {}
    public record ProviderResponse(boolean google, boolean kakao) {}
    public record MessageResponse(String message) {}
}


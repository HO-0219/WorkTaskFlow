package com.teamproject.authentication.application.dto;

public final class OAuthDtos {
    private OAuthDtos() {}
    public record ProviderResponse(boolean google, boolean kakao) {}
}

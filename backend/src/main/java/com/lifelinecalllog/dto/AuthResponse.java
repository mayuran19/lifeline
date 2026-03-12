package com.lifelinecalllog.dto;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    String username,
    String email,
    String role
) {
}

package com.lifelinecalllog.dto;

import java.util.UUID;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    UUID id,
    String username,
    String firstName,
    String lastName,
    String email,
    String role) {}

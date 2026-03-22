package com.lifelinecalllog.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserResponse(
    UUID id,
    String email,
    String firstName,
    String lastName,
    String role,
    boolean enabled,
    OffsetDateTime createdDate,
    OffsetDateTime lastModifiedDate) {}

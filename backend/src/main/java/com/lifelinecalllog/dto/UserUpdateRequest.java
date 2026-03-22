package com.lifelinecalllog.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserUpdateRequest(
    @Email(message = "Email should be valid") String email,
    String firstName,
    String lastName,
    @Pattern(
            regexp = "ROLE_ADMIN|ROLE_OPERATOR",
            message = "Role must be ROLE_ADMIN or ROLE_OPERATOR")
        String role,
    Boolean enabled,
    @Size(min = 8, message = "Password must be at least 8 characters") String password) {}

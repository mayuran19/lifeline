package com.lifelinecalllog.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
    @NotBlank(message = "Email is required") @Email(message = "Email should be valid") String email,
    @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        String password,
    String firstName,
    String lastName,
    @NotBlank(message = "Role is required")
        @Pattern(
            regexp = "ROLE_ADMIN|ROLE_OPERATOR",
            message = "Role must be ROLE_ADMIN or ROLE_OPERATOR")
        String role) {}

package com.lifelinecalllog.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ClinicEmailRequest(@NotBlank @Email String email, String label, boolean primary) {}

package com.lifelinecalllog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DoctorRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Size(max = 50) String providerNumber,
        @Size(max = 30) String phone,
        @Size(max = 100) String email
) {}

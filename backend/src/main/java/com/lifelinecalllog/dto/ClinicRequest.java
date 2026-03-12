package com.lifelinecalllog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ClinicRequest(
        @NotBlank @Size(max = 200) String name,
        @Size(max = 500) String address,
        @Size(max = 30) String phone,
        @Size(max = 30) String fax,
        @Size(max = 100) String email
) {}

package com.lifelinecalllog.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PatientResponse(
        UUID id,
        String firstName,
        String lastName,
        LocalDate dateOfBirth,
        String phone,
        boolean active,
        OffsetDateTime createdDate,
        UUID createdBy,
        OffsetDateTime lastModifiedDate,
        UUID lastModifiedBy,
        int version
) {}

package com.lifelinecalllog.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DoctorResponse(
        UUID id,
        String firstName,
        String lastName,
        String providerNumber,
        String phone,
        String email,
        boolean active,
        OffsetDateTime createdDate,
        UUID createdBy,
        OffsetDateTime lastModifiedDate,
        UUID lastModifiedBy,
        int version
) {}

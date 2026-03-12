package com.lifelinecalllog.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClinicResponse(
        UUID id,
        String name,
        String address,
        String phone,
        String fax,
        String email,
        boolean active,
        OffsetDateTime createdDate,
        UUID createdBy,
        OffsetDateTime lastModifiedDate,
        UUID lastModifiedBy,
        int version
) {}

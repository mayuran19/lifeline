package com.lifelinecalllog.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ClinicResponse(
    UUID id,
    String name,
    String phone,
    String fax,
    boolean active,
    List<ClinicEmailDto> emails,
    List<ClinicLocationDto> locations,
    OffsetDateTime createdDate,
    UUID createdBy,
    OffsetDateTime lastModifiedDate,
    UUID lastModifiedBy,
    int version) {}

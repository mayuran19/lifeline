package com.lifelinecalllog.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ConfigurationResponse(
    String configGroup,
    int groupDisplayOrder,
    String configKey,
    String configDescription,
    int configDisplayOrder,
    String status,
    OffsetDateTime createdDate,
    UUID createdBy,
    OffsetDateTime lastModifiedDate,
    UUID lastModifiedBy,
    int version) {}

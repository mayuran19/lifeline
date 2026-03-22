package com.lifelinecalllog.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ClinicLocationDto(
    UUID id,
    UUID clinicId,
    String name,
    String addressLine1,
    String addressLine2,
    String suburb,
    String state,
    String postcode,
    BigDecimal latitude,
    BigDecimal longitude,
    String placeId,
    String formattedAddress,
    String managerName,
    String careCoordinationName,
    String phone,
    String fax,
    boolean primary,
    boolean active,
    List<ClinicEmailDto> emails) {}

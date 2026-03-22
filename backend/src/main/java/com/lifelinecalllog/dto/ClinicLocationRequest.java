package com.lifelinecalllog.dto;

import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record ClinicLocationRequest(
    @Size(max = 200) String name,
    @Size(max = 255) String addressLine1,
    @Size(max = 255) String addressLine2,
    @Size(max = 100) String suburb,
    @Size(max = 50) String state,
    @Size(max = 10) String postcode,
    BigDecimal latitude,
    BigDecimal longitude,
    @Size(max = 500) String placeId,
    @Size(max = 500) String formattedAddress,
    @Size(max = 200) String managerName,
    @Size(max = 200) String careCoordinationName,
    @Size(max = 30) String phone,
    @Size(max = 30) String fax,
    boolean primary,
    List<ClinicEmailRequest> emails) {}

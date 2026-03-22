package com.lifelinecalllog.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record DoctorResponse(
    UUID id,
    String firstName,
    String lastName,
    String providerNumber,
    String prescriberNo,
    String phone,
    String email,
    boolean active,
    List<DoctorClinicDto> clinics,
    OffsetDateTime createdDate,
    UUID createdBy,
    OffsetDateTime lastModifiedDate,
    UUID lastModifiedBy,
    int version) {}

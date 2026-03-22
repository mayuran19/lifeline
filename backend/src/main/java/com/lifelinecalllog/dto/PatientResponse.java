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
    String medicareNo,
    String irnNo,
    String remark,
    String status,
    String statusReason,
    LocalDate deceasedDate,
    UUID clinicId,
    String clinicName,
    UUID clinicLocationId,
    String clinicLocationName,
    String clinicLocationAddress,
    OffsetDateTime createdDate,
    UUID createdBy,
    OffsetDateTime lastModifiedDate,
    UUID lastModifiedBy,
    int version) {}

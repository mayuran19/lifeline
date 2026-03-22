package com.lifelinecalllog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record PatientRequest(
    @NotBlank @Size(max = 100) String firstName,
    @NotBlank @Size(max = 100) String lastName,
    LocalDate dateOfBirth,
    @Size(max = 30) String phone,
    @Size(max = 50) String medicareNo,
    @Size(max = 50) String irnNo,
    String remark,
    @Pattern(regexp = "ACTIVE|INACTIVE|DECEASED") String status,
    String statusReason,
    LocalDate deceasedDate,
    UUID clinicId,
    UUID clinicLocationId) {}

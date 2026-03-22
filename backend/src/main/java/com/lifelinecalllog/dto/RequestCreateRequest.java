package com.lifelinecalllog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record RequestCreateRequest(
    @NotNull UUID clinicId,
    UUID clinicLocationId,
    UUID doctorId,
    UUID enteredBy,
    @NotBlank String visitType,
    @NotBlank String urgency,
    String requestDetails,
    OffsetDateTime receivedAt,
    List<PatientOnRequest> patients) {
  public record PatientOnRequest(@NotNull UUID patientId, String notes) {}
}

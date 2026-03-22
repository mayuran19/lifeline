package com.lifelinecalllog.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record RequestResponse(
    UUID id,
    UUID clinicId,
    String clinicName,
    UUID clinicLocationId,
    String clinicLocationName,
    UUID doctorId,
    String doctorName,
    UUID enteredBy,
    String enteredByName,
    String visitType,
    String urgency,
    String status,
    String requestDetails,
    OffsetDateTime receivedAt,
    OffsetDateTime startTime,
    OffsetDateTime endTime,
    List<RequestPatientResponse> patients,
    OffsetDateTime createdDate,
    UUID createdBy,
    OffsetDateTime lastModifiedDate,
    UUID lastModifiedBy,
    int version) {
  public record RequestPatientResponse(
      UUID requestPatientId,
      UUID patientId,
      String patientFirstName,
      String patientLastName,
      String medicareNo,
      String notes) {}
}

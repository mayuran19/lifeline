package com.lifelinecalllog.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record RequestUpdateRequest(
    UUID clinicId,
    UUID clinicLocationId,
    UUID doctorId,
    UUID enteredBy,
    String visitType,
    String urgency,
    String status,
    String requestDetails,
    OffsetDateTime receivedAt,
    OffsetDateTime startTime,
    OffsetDateTime endTime) {}

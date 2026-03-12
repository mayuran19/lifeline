package com.lifelinecalllog.dto;

import com.lifelinecalllog.jooq.enums.RequestStatus;
import com.lifelinecalllog.jooq.enums.Urgency;
import com.lifelinecalllog.jooq.enums.VisitType;

import java.time.OffsetDateTime;
import java.util.UUID;

public record RequestUpdateRequest(
        UUID doctorId,
        VisitType visitType,
        Urgency urgency,
        RequestStatus status,
        String requestDetails,
        OffsetDateTime receivedAt,
        OffsetDateTime startTime,
        OffsetDateTime endTime
) {}

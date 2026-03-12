package com.lifelinecalllog.dto;

import com.lifelinecalllog.jooq.enums.RequestStatus;
import com.lifelinecalllog.jooq.enums.Urgency;
import com.lifelinecalllog.jooq.enums.VisitType;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record RequestResponse(
        UUID id,
        UUID clinicId,
        String clinicName,
        UUID doctorId,
        String doctorName,
        VisitType visitType,
        Urgency urgency,
        RequestStatus status,
        String requestDetails,
        OffsetDateTime receivedAt,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        List<RequestPatientResponse> patients,
        OffsetDateTime createdDate,
        UUID createdBy,
        OffsetDateTime lastModifiedDate,
        UUID lastModifiedBy,
        int version
) {
    public record RequestPatientResponse(
            UUID requestPatientId,
            UUID patientId,
            String patientFirstName,
            String patientLastName,
            String notes
    ) {}
}

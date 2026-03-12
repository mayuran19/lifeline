package com.lifelinecalllog.dto;

import com.lifelinecalllog.jooq.enums.RequestStatus;
import com.lifelinecalllog.jooq.enums.Urgency;
import com.lifelinecalllog.jooq.enums.VisitType;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record RequestCreateRequest(
        @NotNull UUID clinicId,
        UUID doctorId,
        @NotNull VisitType visitType,
        @NotNull Urgency urgency,
        String requestDetails,
        OffsetDateTime receivedAt,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        List<PatientOnRequest> patients
) {
    public record PatientOnRequest(
            @NotNull UUID patientId,
            String notes
    ) {}
}

package com.lifelinecalllog.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record DoctorClinicRequest(@NotNull UUID clinicId, UUID clinicLocationId) {}

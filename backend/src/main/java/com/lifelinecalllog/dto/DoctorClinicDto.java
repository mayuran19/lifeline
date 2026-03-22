package com.lifelinecalllog.dto;

import java.util.UUID;

public record DoctorClinicDto(
    UUID id,
    UUID clinicId,
    String clinicName,
    UUID clinicLocationId,
    String clinicLocationName,
    String clinicLocationAddress,
    boolean active) {}

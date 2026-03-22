package com.lifelinecalllog.dto;

import java.util.UUID;

public record ClinicEmailDto(UUID id, String email, String label, boolean primary) {}

package com.lifelinecalllog.dto;

import jakarta.validation.constraints.NotBlank;

public record ConfigurationCreateRequest(
    @NotBlank String configGroup,
    int groupDisplayOrder,
    @NotBlank String configKey,
    String configDescription,
    int configDisplayOrder) {}

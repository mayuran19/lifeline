package com.lifelinecalllog.dto;

public record ConfigurationUpdateRequest(
    String configDescription,
    Integer configDisplayOrder,
    Integer groupDisplayOrder,
    String status) {}

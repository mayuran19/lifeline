package com.lifelinecalllog.controller;

import com.lifelinecalllog.dto.ConfigurationCreateRequest;
import com.lifelinecalllog.dto.ConfigurationResponse;
import com.lifelinecalllog.dto.ConfigurationUpdateRequest;
import com.lifelinecalllog.service.ConfigurationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/configurations")
public class ConfigurationController {

  private final ConfigurationService configurationService;

  public ConfigurationController(ConfigurationService configurationService) {
    this.configurationService = configurationService;
  }

  @GetMapping
  public List<ConfigurationResponse> getAll(@RequestParam(required = false) String group) {
    return configurationService.findAll(group);
  }

  @PostMapping
  public ResponseEntity<ConfigurationResponse> create(
      @Valid @RequestBody ConfigurationCreateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(configurationService.create(request));
  }

  @PatchMapping("/{group}/{key}")
  public ConfigurationResponse update(
      @PathVariable String group,
      @PathVariable String key,
      @RequestBody ConfigurationUpdateRequest request) {
    return configurationService.update(group, key, request);
  }
}

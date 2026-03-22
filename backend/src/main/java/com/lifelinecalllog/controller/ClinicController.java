package com.lifelinecalllog.controller;

import com.lifelinecalllog.dto.*;
import com.lifelinecalllog.service.ClinicService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/clinics")
public class ClinicController {

  private final ClinicService clinicService;

  public ClinicController(ClinicService clinicService) {
    this.clinicService = clinicService;
  }

  // ── Clinic CRUD ────────────────────────────────────────────────────────────

  @GetMapping
  public List<ClinicResponse> getAll(@RequestParam(defaultValue = "true") boolean activeOnly) {
    return clinicService.findAll(activeOnly);
  }

  @GetMapping("/{id}")
  public ClinicResponse getById(@PathVariable UUID id) {
    return clinicService.findById(id);
  }

  @PostMapping
  public ResponseEntity<ClinicResponse> create(@Valid @RequestBody ClinicRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(clinicService.create(request));
  }

  @PutMapping("/{id}")
  public ClinicResponse update(@PathVariable UUID id, @Valid @RequestBody ClinicRequest request) {
    return clinicService.update(id, request);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
    clinicService.deactivate(id);
    return ResponseEntity.noContent().build();
  }

  // ── Clinic emails ──────────────────────────────────────────────────────────

  @PostMapping("/{id}/emails")
  public ResponseEntity<ClinicEmailDto> addEmail(
      @PathVariable UUID id, @Valid @RequestBody ClinicEmailRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(clinicService.addEmail(id, request));
  }

  @PutMapping("/{id}/emails/{emailId}")
  public ClinicEmailDto updateEmail(
      @PathVariable UUID id,
      @PathVariable UUID emailId,
      @Valid @RequestBody ClinicEmailRequest request) {
    return clinicService.updateEmail(id, emailId, request);
  }

  @DeleteMapping("/{id}/emails/{emailId}")
  public ResponseEntity<Void> deleteEmail(@PathVariable UUID id, @PathVariable UUID emailId) {
    clinicService.deleteEmail(id, emailId);
    return ResponseEntity.noContent().build();
  }

  // ── Clinic locations ───────────────────────────────────────────────────────

  @PostMapping("/{id}/locations")
  public ResponseEntity<ClinicLocationDto> addLocation(
      @PathVariable UUID id, @Valid @RequestBody ClinicLocationRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(clinicService.addLocation(id, request));
  }

  @PutMapping("/{id}/locations/{locationId}")
  public ClinicLocationDto updateLocation(
      @PathVariable UUID id,
      @PathVariable UUID locationId,
      @Valid @RequestBody ClinicLocationRequest request) {
    return clinicService.updateLocation(id, locationId, request);
  }

  @DeleteMapping("/{id}/locations/{locationId}")
  public ResponseEntity<Void> deactivateLocation(
      @PathVariable UUID id, @PathVariable UUID locationId) {
    clinicService.deactivateLocation(id, locationId);
    return ResponseEntity.noContent().build();
  }
}

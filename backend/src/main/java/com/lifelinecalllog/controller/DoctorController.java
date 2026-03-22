package com.lifelinecalllog.controller;

import com.lifelinecalllog.dto.DoctorClinicRequest;
import com.lifelinecalllog.dto.DoctorRequest;
import com.lifelinecalllog.dto.DoctorResponse;
import com.lifelinecalllog.service.DoctorService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/doctors")
public class DoctorController {

  private final DoctorService doctorService;

  public DoctorController(DoctorService doctorService) {
    this.doctorService = doctorService;
  }

  @GetMapping
  public List<DoctorResponse> getAll(@RequestParam(defaultValue = "true") boolean activeOnly) {
    return doctorService.findAll(activeOnly);
  }

  @GetMapping("/{id}")
  public DoctorResponse getById(@PathVariable UUID id) {
    return doctorService.findById(id);
  }

  @PostMapping
  public ResponseEntity<DoctorResponse> create(@Valid @RequestBody DoctorRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(doctorService.create(request));
  }

  @PutMapping("/{id}")
  public DoctorResponse update(@PathVariable UUID id, @Valid @RequestBody DoctorRequest request) {
    return doctorService.update(id, request);
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
    doctorService.deactivate(id);
    return ResponseEntity.noContent().build();
  }

  // ── Clinic associations ────────────────────────────────────────────────────

  @PostMapping("/{id}/clinics")
  public DoctorResponse addClinic(
      @PathVariable UUID id, @Valid @RequestBody DoctorClinicRequest request) {
    return doctorService.addClinic(id, request);
  }

  @DeleteMapping("/{id}/clinics/{associationId}")
  public DoctorResponse removeClinic(@PathVariable UUID id, @PathVariable UUID associationId) {
    return doctorService.removeClinic(id, associationId);
  }
}

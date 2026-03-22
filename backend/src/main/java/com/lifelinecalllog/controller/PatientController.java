package com.lifelinecalllog.controller;

import com.lifelinecalllog.dto.PageResponse;
import com.lifelinecalllog.dto.PatientRequest;
import com.lifelinecalllog.dto.PatientResponse;
import com.lifelinecalllog.service.PatientService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/patients")
public class PatientController {

  private final PatientService patientService;

  public PatientController(PatientService patientService) {
    this.patientService = patientService;
  }

  @GetMapping
  public PageResponse<PatientResponse> getAll(
      @RequestParam(defaultValue = "true") boolean activeOnly,
      @RequestParam(required = false) String search,
      @RequestParam(defaultValue = "lastName") String sortBy,
      @RequestParam(defaultValue = "asc") String sortDir,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return patientService.findAll(activeOnly, search, sortBy, sortDir, page, size);
  }

  @GetMapping("/search")
  public List<PatientResponse> search(
      @RequestParam(defaultValue = "true") boolean activeOnly,
      @RequestParam(required = false) String q) {
    return patientService.findAllForSearch(activeOnly, q);
  }

  @GetMapping("/{id}")
  public PatientResponse getById(@PathVariable UUID id) {
    return patientService.findById(id);
  }

  @PostMapping
  public ResponseEntity<PatientResponse> create(@Valid @RequestBody PatientRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(patientService.create(request));
  }

  @PutMapping("/{id}")
  public PatientResponse update(@PathVariable UUID id, @Valid @RequestBody PatientRequest request) {
    return patientService.update(id, request);
  }
}

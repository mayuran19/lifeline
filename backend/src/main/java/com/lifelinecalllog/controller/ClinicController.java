package com.lifelinecalllog.controller;

import com.lifelinecalllog.dto.ClinicRequest;
import com.lifelinecalllog.dto.ClinicResponse;
import com.lifelinecalllog.service.ClinicService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/clinics")
public class ClinicController {

    private final ClinicService clinicService;

    public ClinicController(ClinicService clinicService) {
        this.clinicService = clinicService;
    }

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
}

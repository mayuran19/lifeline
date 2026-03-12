package com.lifelinecalllog.controller;

import com.lifelinecalllog.dto.DoctorRequest;
import com.lifelinecalllog.dto.DoctorResponse;
import com.lifelinecalllog.service.DoctorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

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
}

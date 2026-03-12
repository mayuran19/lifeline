package com.lifelinecalllog.controller;

import com.lifelinecalllog.dto.RequestCreateRequest;
import com.lifelinecalllog.dto.RequestResponse;
import com.lifelinecalllog.dto.RequestUpdateRequest;
import com.lifelinecalllog.jooq.enums.RequestStatus;
import com.lifelinecalllog.service.RequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/requests")
public class RequestController {

    private final RequestService requestService;

    public RequestController(RequestService requestService) {
        this.requestService = requestService;
    }

    @GetMapping
    public List<RequestResponse> getAll(
            @RequestParam(required = false) RequestStatus status,
            @RequestParam(required = false) UUID clinicId) {
        return requestService.findAll(status, clinicId);
    }

    @GetMapping("/{id}")
    public RequestResponse getById(@PathVariable UUID id) {
        return requestService.findById(id);
    }

    @PostMapping
    public ResponseEntity<RequestResponse> create(@Valid @RequestBody RequestCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(requestService.create(request));
    }

    @PatchMapping("/{id}")
    public RequestResponse update(@PathVariable UUID id, @RequestBody RequestUpdateRequest request) {
        return requestService.update(id, request);
    }

    @PostMapping("/{id}/patients")
    public RequestResponse addPatient(@PathVariable UUID id,
                                      @Valid @RequestBody RequestCreateRequest.PatientOnRequest patient) {
        return requestService.addPatient(id, patient);
    }

    @DeleteMapping("/{id}/patients/{requestPatientId}")
    public RequestResponse removePatient(@PathVariable UUID id,
                                         @PathVariable UUID requestPatientId) {
        return requestService.removePatient(id, requestPatientId);
    }
}

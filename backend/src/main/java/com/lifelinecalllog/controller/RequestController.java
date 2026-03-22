package com.lifelinecalllog.controller;

import com.lifelinecalllog.dto.RequestCreateRequest;
import com.lifelinecalllog.dto.RequestResponse;
import com.lifelinecalllog.dto.RequestUpdateRequest;
import com.lifelinecalllog.dto.UserResponse;
import com.lifelinecalllog.service.RequestService;
import com.lifelinecalllog.service.UserManagementService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/requests")
public class RequestController {

  private final RequestService requestService;
  private final UserManagementService userManagementService;

  public RequestController(
      RequestService requestService, UserManagementService userManagementService) {
    this.requestService = requestService;
    this.userManagementService = userManagementService;
  }

  @GetMapping("/users")
  public List<UserResponse> getUsers() {
    return userManagementService.findAll();
  }

  @GetMapping
  public List<RequestResponse> getAll(
      @RequestParam(required = false) String status,
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
  public RequestResponse addPatient(
      @PathVariable UUID id, @Valid @RequestBody RequestCreateRequest.PatientOnRequest patient) {
    return requestService.addPatient(id, patient);
  }

  @DeleteMapping("/{id}/patients/{requestPatientId}")
  public RequestResponse removePatient(@PathVariable UUID id, @PathVariable UUID requestPatientId) {
    return requestService.removePatient(id, requestPatientId);
  }
}

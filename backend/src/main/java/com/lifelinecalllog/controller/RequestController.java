package com.lifelinecalllog.controller;

import com.lifelinecalllog.dto.PageResponse;
import com.lifelinecalllog.dto.RequestCreateRequest;
import com.lifelinecalllog.dto.RequestResponse;
import com.lifelinecalllog.dto.RequestUpdateRequest;
import com.lifelinecalllog.dto.UserResponse;
import com.lifelinecalllog.service.ConfigurationService;
import com.lifelinecalllog.service.RequestExportService;
import com.lifelinecalllog.service.RequestService;
import com.lifelinecalllog.service.UserManagementService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/requests")
public class RequestController {

  private final RequestService requestService;
  private final UserManagementService userManagementService;
  private final RequestExportService requestExportService;
  private final ConfigurationService configurationService;

  public RequestController(
      RequestService requestService,
      UserManagementService userManagementService,
      RequestExportService requestExportService,
      ConfigurationService configurationService) {
    this.requestService = requestService;
    this.userManagementService = userManagementService;
    this.requestExportService = requestExportService;
    this.configurationService = configurationService;
  }

  @GetMapping("/users")
  public List<UserResponse> getUsers() {
    return userManagementService.findAll();
  }

  @GetMapping
  public PageResponse<RequestResponse> getAll(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) UUID clinicId,
      @RequestParam(required = false) UUID locationId,
      @RequestParam(required = false) UUID doctorId,
      @RequestParam(required = false) String receivedDate,
      @RequestParam(defaultValue = "receivedAt") String sortBy,
      @RequestParam(defaultValue = "desc") String sortDir,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return requestService.findAll(
        status, clinicId, locationId, doctorId, receivedDate, sortBy, sortDir, page, size);
  }

  @GetMapping("/export")
  public ResponseEntity<byte[]> export(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) UUID clinicId,
      @RequestParam(required = false) UUID locationId,
      @RequestParam(required = false) UUID doctorId,
      @RequestParam(required = false) String receivedDate)
      throws IOException {
    Map<String, String> visitTypeLabels = configLabels("VISIT_TYPE");
    Map<String, String> urgencyLabels = configLabels("URGENCY");
    Map<String, String> statusLabels = configLabels("REQUEST_STATUS");
    byte[] bytes =
        requestExportService.export(
            status,
            clinicId,
            locationId,
            doctorId,
            receivedDate,
            visitTypeLabels,
            urgencyLabels,
            statusLabels);
    String filename = "requests-" + LocalDate.now() + ".xlsx";
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
        .contentType(
            MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .body(bytes);
  }

  private Map<String, String> configLabels(String group) {
    return configurationService.findAll(group).stream()
        .collect(
            Collectors.toMap(
                c -> c.configKey(),
                c -> c.configDescription() != null ? c.configDescription() : c.configKey()));
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

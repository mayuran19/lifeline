package com.lifelinecalllog.controller;

import com.lifelinecalllog.dto.UserCreateRequest;
import com.lifelinecalllog.dto.UserResponse;
import com.lifelinecalllog.dto.UserUpdateRequest;
import com.lifelinecalllog.service.UserManagementService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/users")
public class PlatformAdminController {

  private final UserManagementService userManagementService;

  public PlatformAdminController(UserManagementService userManagementService) {
    this.userManagementService = userManagementService;
  }

  @GetMapping
  public List<UserResponse> getAll() {
    return userManagementService.findAll();
  }

  @GetMapping("/{id}")
  public UserResponse getById(@PathVariable UUID id) {
    return userManagementService.findById(id);
  }

  @PostMapping
  public ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(userManagementService.create(request));
  }

  @PutMapping("/{id}")
  public UserResponse update(@PathVariable UUID id, @Valid @RequestBody UserUpdateRequest request) {
    return userManagementService.update(id, request);
  }
}

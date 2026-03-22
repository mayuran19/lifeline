package com.lifelinecalllog.controller;

import static com.lifelinecalllog.jooq.Tables.APP_USER;

import com.lifelinecalllog.dto.UserResponse;
import com.lifelinecalllog.service.UserManagementService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.jooq.DSLContext;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/user")
public class UserController {

  private final UserManagementService userManagementService;
  private final DSLContext dsl;
  private final PasswordEncoder passwordEncoder;

  public UserController(
      UserManagementService userManagementService,
      DSLContext dsl,
      PasswordEncoder passwordEncoder) {
    this.userManagementService = userManagementService;
    this.dsl = dsl;
    this.passwordEncoder = passwordEncoder;
  }

  @GetMapping("/profile")
  public UserResponse getProfile(Authentication authentication) {
    return userManagementService.findByEmail(authentication.getName());
  }

  record UpdateProfileRequest(String firstName, String lastName) {}

  @PatchMapping("/profile")
  public UserResponse updateProfile(
      Authentication authentication, @RequestBody UpdateProfileRequest request) {
    var user = userManagementService.findByEmail(authentication.getName());
    var dto =
        new com.lifelinecalllog.dto.UserUpdateRequest(
            null, request.firstName(), request.lastName(), null, null, null);
    return userManagementService.update(user.id(), dto);
  }

  record ChangePasswordRequest(
      @NotBlank String currentPassword,
      @NotBlank @Size(min = 8, message = "New password must be at least 8 characters")
          String newPassword) {}

  @PostMapping("/change-password")
  public Map<String, String> changePassword(
      Authentication authentication, @Valid @RequestBody ChangePasswordRequest request) {
    var record =
        dsl.selectFrom(APP_USER).where(APP_USER.EMAIL.eq(authentication.getName())).fetchOne();
    if (record == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
    }
    if (!passwordEncoder.matches(request.currentPassword(), record.getPasswordHash())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
    }
    dsl.update(APP_USER)
        .set(APP_USER.PASSWORD_HASH, passwordEncoder.encode(request.newPassword()))
        .where(APP_USER.ID.eq(record.getId()))
        .execute();
    return Map.of("message", "Password changed successfully");
  }
}

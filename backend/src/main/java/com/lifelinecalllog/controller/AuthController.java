package com.lifelinecalllog.controller;

import com.lifelinecalllog.dto.AuthResponse;
import com.lifelinecalllog.dto.LoginRequest;
import com.lifelinecalllog.service.AuthService;
import com.lifelinecalllog.service.PasswordResetService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  @Autowired private AuthService authService;

  @Autowired private PasswordResetService passwordResetService;

  @PostMapping("/login")
  public ResponseEntity<AuthResponse> login(
      @Valid @RequestBody LoginRequest request, HttpServletResponse response) {
    AuthResponse authResponse = authService.login(request, response);
    return ResponseEntity.ok(authResponse);
  }

  @PostMapping("/refresh")
  public ResponseEntity<AuthResponse> refresh(
      HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = extractCookieValue(request, "refreshToken");
    if (refreshToken == null) {
      return ResponseEntity.badRequest().build();
    }
    AuthResponse authResponse = authService.refreshToken(refreshToken, response);
    return ResponseEntity.ok(authResponse);
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
    String refreshToken = extractCookieValue(request, "refreshToken");
    authService.logout(refreshToken, response);
    return ResponseEntity.ok().build();
  }

  record ForgotPasswordRequest(@NotBlank @Email String email) {}

  @PostMapping("/forgot-password")
  public ResponseEntity<Map<String, String>> forgotPassword(
      @Valid @RequestBody ForgotPasswordRequest request) {
    passwordResetService.requestReset(request.email());
    // Always return OK to avoid leaking whether an account exists
    return ResponseEntity.ok(
        Map.of("message", "If that email is registered, a reset link has been sent."));
  }

  record ResetPasswordRequest(
      @NotBlank String token,
      @NotBlank @Size(min = 8, message = "Password must be at least 8 characters")
          String newPassword) {}

  @PostMapping("/reset-password")
  public ResponseEntity<Map<String, String>> resetPassword(
      @Valid @RequestBody ResetPasswordRequest request) {
    passwordResetService.resetPassword(request.token(), request.newPassword());
    return ResponseEntity.ok(Map.of("message", "Password has been reset successfully."));
  }

  private String extractCookieValue(HttpServletRequest request, String name) {
    if (request.getCookies() == null) return null;
    for (Cookie cookie : request.getCookies()) {
      if (name.equals(cookie.getName())) return cookie.getValue();
    }
    return null;
  }
}

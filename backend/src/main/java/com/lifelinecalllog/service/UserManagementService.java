package com.lifelinecalllog.service;

import static com.lifelinecalllog.jooq.Tables.APP_USER;

import com.lifelinecalllog.dto.UserCreateRequest;
import com.lifelinecalllog.dto.UserResponse;
import com.lifelinecalllog.dto.UserUpdateRequest;
import java.util.List;
import java.util.UUID;
import org.jooq.DSLContext;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserManagementService {

  private final DSLContext dsl;
  private final PasswordEncoder passwordEncoder;

  public UserManagementService(DSLContext dsl, PasswordEncoder passwordEncoder) {
    this.dsl = dsl;
    this.passwordEncoder = passwordEncoder;
  }

  public List<UserResponse> findAll() {
    return dsl.selectFrom(APP_USER)
        .orderBy(APP_USER.EMAIL.asc())
        .fetch(
            r ->
                new UserResponse(
                    r.getId(),
                    r.getEmail(),
                    r.getFirstName(),
                    r.getLastName(),
                    r.getRole(),
                    Boolean.TRUE.equals(r.getEnabled()),
                    r.getCreatedDate(),
                    r.getLastModifiedDate()));
  }

  public UserResponse findById(UUID id) {
    return dsl.selectFrom(APP_USER)
        .where(APP_USER.ID.eq(id))
        .fetchOptional(
            r ->
                new UserResponse(
                    r.getId(),
                    r.getEmail(),
                    r.getFirstName(),
                    r.getLastName(),
                    r.getRole(),
                    Boolean.TRUE.equals(r.getEnabled()),
                    r.getCreatedDate(),
                    r.getLastModifiedDate()))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
  }

  public UserResponse findByEmail(String email) {
    return dsl.selectFrom(APP_USER)
        .where(APP_USER.EMAIL.eq(email))
        .fetchOptional(
            r ->
                new UserResponse(
                    r.getId(),
                    r.getEmail(),
                    r.getFirstName(),
                    r.getLastName(),
                    r.getRole(),
                    Boolean.TRUE.equals(r.getEnabled()),
                    r.getCreatedDate(),
                    r.getLastModifiedDate()))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
  }

  @Transactional
  public UserResponse create(UserCreateRequest request) {
    boolean emailExists =
        dsl.fetchExists(dsl.selectFrom(APP_USER).where(APP_USER.EMAIL.eq(request.email())));
    if (emailExists) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
    }

    // username = email (email is the login identifier)
    var record =
        dsl.insertInto(
                APP_USER,
                APP_USER.USERNAME,
                APP_USER.EMAIL,
                APP_USER.PASSWORD_HASH,
                APP_USER.FIRST_NAME,
                APP_USER.LAST_NAME,
                APP_USER.ROLE,
                APP_USER.ENABLED)
            .values(
                request.email(),
                request.email(),
                passwordEncoder.encode(request.password()),
                request.firstName(),
                request.lastName(),
                request.role(),
                true)
            .returning()
            .fetchOne();

    return new UserResponse(
        record.getId(),
        record.getEmail(),
        record.getFirstName(),
        record.getLastName(),
        record.getRole(),
        Boolean.TRUE.equals(record.getEnabled()),
        record.getCreatedDate(),
        record.getLastModifiedDate());
  }

  @Transactional
  public UserResponse update(UUID id, UserUpdateRequest request) {
    var existing = dsl.selectFrom(APP_USER).where(APP_USER.ID.eq(id)).fetchOne();
    if (existing == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
    }

    if (request.email() != null && !request.email().equals(existing.getEmail())) {
      boolean emailExists =
          dsl.fetchExists(dsl.selectFrom(APP_USER).where(APP_USER.EMAIL.eq(request.email())));
      if (emailExists) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
      }
      existing.setEmail(request.email());
      existing.setUsername(request.email()); // keep username in sync with email
    }
    if (request.firstName() != null) existing.setFirstName(request.firstName());
    if (request.lastName() != null) existing.setLastName(request.lastName());
    if (request.role() != null) existing.setRole(request.role());
    if (request.enabled() != null) existing.setEnabled(request.enabled());
    if (request.password() != null && !request.password().isBlank()) {
      existing.setPasswordHash(passwordEncoder.encode(request.password()));
    }

    existing.store();

    return new UserResponse(
        existing.getId(),
        existing.getEmail(),
        existing.getFirstName(),
        existing.getLastName(),
        existing.getRole(),
        Boolean.TRUE.equals(existing.getEnabled()),
        existing.getCreatedDate(),
        existing.getLastModifiedDate());
  }
}

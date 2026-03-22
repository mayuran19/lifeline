package com.lifelinecalllog.service;

import static com.lifelinecalllog.jooq.Tables.APP_USER;
import static com.lifelinecalllog.jooq.Tables.REFRESH_TOKEN;

import com.lifelinecalllog.dto.AuthResponse;
import com.lifelinecalllog.dto.LoginRequest;
import com.lifelinecalllog.jooq.tables.records.AppUserRecord;
import com.lifelinecalllog.security.JwtUtil;
import jakarta.servlet.http.HttpServletResponse;
import java.time.OffsetDateTime;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  @Autowired private DSLContext dsl;

  @Autowired private JwtUtil jwtUtil;

  @Autowired private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

  @Value("${cookie.secure}")
  private boolean cookieSecure;

  @Value("${cookie.http-only}")
  private boolean cookieHttpOnly;

  @Value("${jwt.access-token.expiration}")
  private Long accessTokenExpiration;

  @Value("${jwt.refresh-token.expiration}")
  private Long refreshTokenExpiration;

  @Value("${security.max-failed-attempts:3}")
  private int maxFailedAttempts;

  @Value("${security.lockout-duration-minutes:2}")
  private int lockoutDurationMinutes;

  @Transactional
  public AuthResponse login(LoginRequest request, HttpServletResponse response) {
    AppUserRecord user =
        dsl.selectFrom(APP_USER).where(APP_USER.EMAIL.eq(request.username())).fetchOne();

    if (user == null || !Boolean.TRUE.equals(user.getEnabled())) {
      throw new BadCredentialsException("Invalid email or password");
    }

    // Check if account is locked
    if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(OffsetDateTime.now())) {
      long secondsLeft =
          OffsetDateTime.now().until(user.getLockedUntil(), java.time.temporal.ChronoUnit.SECONDS);
      throw new LockedException(
          "Account locked. Try again in " + ((secondsLeft / 60) + 1) + " minute(s).");
    }

    // Clear stale lock if lockout window has expired
    if (user.getLockedUntil() != null && !user.getLockedUntil().isAfter(OffsetDateTime.now())) {
      dsl.update(APP_USER)
          .set(APP_USER.FAILED_LOGIN_ATTEMPTS, 0)
          .setNull(APP_USER.LOCKED_UNTIL)
          .where(APP_USER.ID.eq(user.getId()))
          .execute();
      user.setFailedLoginAttempts(0);
      user.setLockedUntil(null);
    }

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      int attempts = user.getFailedLoginAttempts() + 1;
      if (attempts >= maxFailedAttempts) {
        dsl.update(APP_USER)
            .set(APP_USER.FAILED_LOGIN_ATTEMPTS, attempts)
            .set(APP_USER.LOCKED_UNTIL, OffsetDateTime.now().plusMinutes(lockoutDurationMinutes))
            .where(APP_USER.ID.eq(user.getId()))
            .execute();
        throw new LockedException(
            "Too many failed attempts. Account locked for "
                + lockoutDurationMinutes
                + " minute(s).");
      } else {
        dsl.update(APP_USER)
            .set(APP_USER.FAILED_LOGIN_ATTEMPTS, attempts)
            .where(APP_USER.ID.eq(user.getId()))
            .execute();
        int remaining = maxFailedAttempts - attempts;
        throw new BadCredentialsException(
            "Invalid email or password. " + remaining + " attempt(s) remaining.");
      }
    }

    // Successful login — reset failed attempts
    dsl.update(APP_USER)
        .set(APP_USER.FAILED_LOGIN_ATTEMPTS, 0)
        .setNull(APP_USER.LOCKED_UNTIL)
        .where(APP_USER.ID.eq(user.getId()))
        .execute();

    String accessToken = jwtUtil.generateAccessToken(user.getUsername(), user.getRole());
    String refreshToken = jwtUtil.generateRefreshToken(user.getUsername(), user.getRole());

    dsl.insertInto(
            REFRESH_TOKEN,
            REFRESH_TOKEN.TOKEN,
            REFRESH_TOKEN.USER_ID,
            REFRESH_TOKEN.EXPIRY_DATE,
            REFRESH_TOKEN.REVOKED)
        .values(
            refreshToken,
            user.getId(),
            OffsetDateTime.now().plusSeconds(refreshTokenExpiration / 1000),
            false)
        .execute();

    setAuthCookies(response, accessToken, refreshToken);

    return new AuthResponse(
        accessToken,
        refreshToken,
        user.getId(),
        user.getUsername(),
        user.getFirstName(),
        user.getLastName(),
        user.getEmail(),
        user.getRole());
  }

  @Transactional
  public AuthResponse refreshToken(String refreshTokenValue, HttpServletResponse response) {
    var tokenRow =
        dsl.select(REFRESH_TOKEN.REVOKED, REFRESH_TOKEN.EXPIRY_DATE)
            .from(REFRESH_TOKEN)
            .where(REFRESH_TOKEN.TOKEN.eq(refreshTokenValue))
            .fetchOne();

    if (tokenRow == null || Boolean.TRUE.equals(tokenRow.get(REFRESH_TOKEN.REVOKED))) {
      throw new BadCredentialsException("Invalid or revoked refresh token");
    }

    if (tokenRow.get(REFRESH_TOKEN.EXPIRY_DATE).isBefore(OffsetDateTime.now())) {
      throw new BadCredentialsException("Refresh token expired");
    }

    String username = jwtUtil.extractUsername(refreshTokenValue);
    AppUserRecord user = dsl.selectFrom(APP_USER).where(APP_USER.USERNAME.eq(username)).fetchOne();

    if (user == null || !Boolean.TRUE.equals(user.getEnabled())) {
      throw new BadCredentialsException("User not found or disabled");
    }

    String newAccessToken = jwtUtil.generateAccessToken(user.getUsername(), user.getRole());
    setAccessTokenCookie(response, newAccessToken);

    return new AuthResponse(
        newAccessToken,
        refreshTokenValue,
        user.getId(),
        user.getUsername(),
        user.getFirstName(),
        user.getLastName(),
        user.getEmail(),
        user.getRole());
  }

  @Transactional
  public void logout(String refreshTokenValue, HttpServletResponse response) {
    if (refreshTokenValue != null) {
      dsl.update(REFRESH_TOKEN)
          .set(REFRESH_TOKEN.REVOKED, true)
          .where(REFRESH_TOKEN.TOKEN.eq(refreshTokenValue))
          .execute();
    }
    clearAuthCookies(response);
  }

  private void setAuthCookies(
      HttpServletResponse response, String accessToken, String refreshToken) {
    setAccessTokenCookie(response, accessToken);
    setRefreshTokenCookie(response, refreshToken);
  }

  private void setAccessTokenCookie(HttpServletResponse response, String accessToken) {
    addCookieHeader(response, "accessToken", accessToken, (int) (accessTokenExpiration / 1000));
  }

  private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
    addCookieHeader(response, "refreshToken", refreshToken, (int) (refreshTokenExpiration / 1000));
  }

  private void addCookieHeader(
      HttpServletResponse response, String name, String value, int maxAge) {
    StringBuilder sb = new StringBuilder();
    sb.append(name).append("=").append(value);
    sb.append("; Path=/");
    sb.append("; Max-Age=").append(maxAge);
    if (cookieHttpOnly) sb.append("; HttpOnly");
    if (cookieSecure) sb.append("; Secure");
    sb.append("; SameSite=Strict");
    response.addHeader("Set-Cookie", sb.toString());
  }

  private void clearAuthCookies(HttpServletResponse response) {
    response.addHeader("Set-Cookie", "accessToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict");
    response.addHeader("Set-Cookie", "refreshToken=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict");
  }
}

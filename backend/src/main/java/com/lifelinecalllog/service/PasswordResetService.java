package com.lifelinecalllog.service;

import static com.lifelinecalllog.jooq.Tables.APP_USER;
import static com.lifelinecalllog.jooq.Tables.PASSWORD_RESET_TOKEN;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {

  private final DSLContext dsl;
  private final EmailService emailService;
  private final PasswordEncoder passwordEncoder;

  @Value("${security.password-reset-expiry-minutes:30}")
  private int expiryMinutes;

  private final SecureRandom secureRandom = new SecureRandom();

  public PasswordResetService(
      DSLContext dsl, EmailService emailService, PasswordEncoder passwordEncoder) {
    this.dsl = dsl;
    this.emailService = emailService;
    this.passwordEncoder = passwordEncoder;
  }

  @Transactional
  public void requestReset(String email) {
    var user = dsl.selectFrom(APP_USER).where(APP_USER.EMAIL.eq(email)).fetchOne();

    // Always return without error even if email not found (security: don't leak account existence)
    if (user == null || !Boolean.TRUE.equals(user.getEnabled())) {
      return;
    }

    // Invalidate any existing unused tokens for this user
    dsl.update(PASSWORD_RESET_TOKEN)
        .set(PASSWORD_RESET_TOKEN.USED, true)
        .where(
            PASSWORD_RESET_TOKEN.USER_ID.eq(user.getId()).and(PASSWORD_RESET_TOKEN.USED.eq(false)))
        .execute();

    // Generate a secure token
    byte[] bytes = new byte[48];
    secureRandom.nextBytes(bytes);
    String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

    dsl.insertInto(
            PASSWORD_RESET_TOKEN,
            PASSWORD_RESET_TOKEN.TOKEN,
            PASSWORD_RESET_TOKEN.USER_ID,
            PASSWORD_RESET_TOKEN.EXPIRES_AT,
            PASSWORD_RESET_TOKEN.USED)
        .values(token, user.getId(), OffsetDateTime.now().plusMinutes(expiryMinutes), false)
        .execute();

    emailService.sendPasswordResetEmail(email, token);
  }

  @Transactional
  public void resetPassword(String token, String newPassword) {
    var tokenRecord =
        dsl.selectFrom(PASSWORD_RESET_TOKEN).where(PASSWORD_RESET_TOKEN.TOKEN.eq(token)).fetchOne();

    if (tokenRecord == null
        || Boolean.TRUE.equals(tokenRecord.getUsed())
        || tokenRecord.getExpiresAt().isBefore(OffsetDateTime.now())) {
      throw new IllegalArgumentException("Invalid or expired password reset link");
    }

    // Mark token used
    dsl.update(PASSWORD_RESET_TOKEN)
        .set(PASSWORD_RESET_TOKEN.USED, true)
        .where(PASSWORD_RESET_TOKEN.TOKEN.eq(token))
        .execute();

    // Update password and unlock account
    dsl.update(APP_USER)
        .set(APP_USER.PASSWORD_HASH, passwordEncoder.encode(newPassword))
        .set(APP_USER.FAILED_LOGIN_ATTEMPTS, 0)
        .setNull(APP_USER.LOCKED_UNTIL)
        .where(APP_USER.ID.eq(tokenRecord.getUserId()))
        .execute();
  }
}

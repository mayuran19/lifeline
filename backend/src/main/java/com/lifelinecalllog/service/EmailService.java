package com.lifelinecalllog.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

  private static final Logger log = LoggerFactory.getLogger(EmailService.class);

  @Value("${resend.api-key}")
  private String apiKey;

  @Value("${resend.from}")
  private String fromAddress;

  @Value("${app.base-url}")
  private String baseUrl;

  public void sendPasswordResetEmail(String toEmail, String token) {
    String resetLink = baseUrl + "/reset-password?token=" + token;

    String body =
        "You requested a password reset for your Lifeline Call Log account.\n\n"
            + "Click the link below to reset your password (valid for 30 minutes):\n\n"
            + resetLink
            + "\n\n"
            + "If you did not request this, please ignore this email.\n\n"
            + "— Lifeline Call Log";

    Resend resend = new Resend(apiKey);

    CreateEmailOptions params =
        CreateEmailOptions.builder()
            .from(fromAddress)
            .to(toEmail)
            .subject("Lifeline Call Log — Password Reset")
            .text(body)
            .build();

    try {
      resend.emails().send(params);
    } catch (ResendException e) {
      log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage(), e);
      throw new RuntimeException("Failed to send password reset email", e);
    }
  }
}

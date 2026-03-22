-- Migration: Account lockout + password reset token table

-- Add lockout columns to app_user
ALTER TABLE app_user
    ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN locked_until TIMESTAMPTZ;

-- Password reset token table
CREATE TABLE password_reset_token (
    token       VARCHAR(64) PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_token_user_id ON password_reset_token(user_id);

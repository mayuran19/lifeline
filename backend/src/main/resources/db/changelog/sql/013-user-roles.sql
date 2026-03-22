-- Migration: Add ROLE_OPERATOR as a valid role alongside ROLE_ADMIN
-- No schema change needed; role is VARCHAR(50) already.
-- Existing admin user retains ROLE_ADMIN.
-- Operators are created via the user management UI by admins.

-- Add a check constraint to enforce only valid roles
ALTER TABLE app_user ADD CONSTRAINT chk_app_user_role
    CHECK (role IN ('ROLE_ADMIN', 'ROLE_OPERATOR'));
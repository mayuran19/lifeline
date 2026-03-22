-- Migration: Remove UUID PK from configuration, use (config_group, config_key) as composite PK
-- Also migrate app_user to use email as username (email is the login identifier)

-- Part 1: Configuration composite PK
-- Drop the old UUID PK and use composite PK instead
ALTER TABLE configuration DROP CONSTRAINT configuration_pkey;
ALTER TABLE configuration DROP COLUMN id;
ALTER TABLE configuration ADD PRIMARY KEY (config_group, config_key);

-- Update history table to remove id column as well
ALTER TABLE configuration_history DROP COLUMN id;

-- Part 2: Email as username for app_user
-- Set username = email for all existing users
UPDATE app_user SET username = email WHERE username != email;

-- Ensure email has unique constraint (username already has unique constraint and will equal email)
ALTER TABLE app_user ADD CONSTRAINT uq_app_user_email UNIQUE (email);

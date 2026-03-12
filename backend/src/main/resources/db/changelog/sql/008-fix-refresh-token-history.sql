-- Drop stale columns from refresh_token_history that were removed from the main table
ALTER TABLE refresh_token_history DROP COLUMN IF EXISTS admin_id;
ALTER TABLE refresh_token_history DROP COLUMN IF EXISTS user_type;

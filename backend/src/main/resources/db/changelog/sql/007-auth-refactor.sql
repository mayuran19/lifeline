-- Drop platform_admin FK constraint and admin_id column from refresh_token
-- Simplify refresh_token to only link to app_user
ALTER TABLE refresh_token DROP CONSTRAINT IF EXISTS chk_user_or_admin;
ALTER TABLE refresh_token DROP CONSTRAINT IF EXISTS fk_refresh_token_admin;
ALTER TABLE refresh_token DROP COLUMN IF EXISTS admin_id;
ALTER TABLE refresh_token DROP COLUMN IF EXISTS user_type;
ALTER TABLE refresh_token ALTER COLUMN user_id SET NOT NULL;

-- Drop the old idx_refresh_token_admin_id index if it exists
DROP INDEX IF EXISTS idx_refresh_token_admin_id;

-- Drop platform_admin history triggers and table (no longer needed)
DROP TRIGGER IF EXISTS platform_admin_audit_insert ON platform_admin;
DROP TRIGGER IF EXISTS platform_admin_audit_update ON platform_admin;
DROP TRIGGER IF EXISTS platform_admin_history_trigger ON platform_admin;
DROP TABLE IF EXISTS platform_admin_history;
DROP TABLE IF EXISTS platform_admin;

-- Seed initial admin user (password: 'password')
INSERT INTO app_user (username, email, password_hash, first_name, last_name, role, enabled)
VALUES (
    'admin',
    'admin@lifeline.local',
    '$2b$10$bJcy7UIByuueLpC2veNV4O3tMWe14k0GX.FYKMF.n5vRlN5alsqbi',
    'System',
    'Admin',
    'ROLE_ADMIN',
    true
) ON CONFLICT (username) DO NOTHING;

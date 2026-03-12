-- Create app_user history table
CREATE TABLE app_user_history (
    id UUID,
    username VARCHAR(50),
    email VARCHAR(100),
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50),
    enabled BOOLEAN,
    created_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMPTZ,
    last_modified_by VARCHAR(100),
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create platform_admin history table
CREATE TABLE platform_admin_history (
    id UUID,
    username VARCHAR(50),
    email VARCHAR(100),
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    enabled BOOLEAN,
    created_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMPTZ,
    last_modified_by VARCHAR(100),
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create refresh_token history table
CREATE TABLE refresh_token_history (
    id UUID,
    token VARCHAR(500),
    user_id UUID,
    admin_id UUID,
    user_type VARCHAR(20),
    expiry_date TIMESTAMPTZ,
    revoked BOOLEAN,
    created_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMPTZ,
    last_modified_by VARCHAR(100),
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Function to record history for app_user
CREATE OR REPLACE FUNCTION app_user_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO app_user_history SELECT OLD.*, 'DELETE', CURRENT_TIMESTAMP;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO app_user_history SELECT NEW.*, 'UPDATE', CURRENT_TIMESTAMP;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO app_user_history SELECT NEW.*, 'INSERT', CURRENT_TIMESTAMP;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to record history for platform_admin
CREATE OR REPLACE FUNCTION platform_admin_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO platform_admin_history SELECT OLD.*, 'DELETE', CURRENT_TIMESTAMP;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO platform_admin_history SELECT NEW.*, 'UPDATE', CURRENT_TIMESTAMP;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO platform_admin_history SELECT NEW.*, 'INSERT', CURRENT_TIMESTAMP;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to record history for refresh_token
CREATE OR REPLACE FUNCTION refresh_token_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO refresh_token_history SELECT OLD.*, 'DELETE', CURRENT_TIMESTAMP;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO refresh_token_history SELECT NEW.*, 'UPDATE', CURRENT_TIMESTAMP;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO refresh_token_history SELECT NEW.*, 'INSERT', CURRENT_TIMESTAMP;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for app_user history
CREATE TRIGGER app_user_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON app_user
    FOR EACH ROW
    EXECUTE FUNCTION app_user_history_trigger_func();

-- Create triggers for platform_admin history
CREATE TRIGGER platform_admin_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON platform_admin
    FOR EACH ROW
    EXECUTE FUNCTION platform_admin_history_trigger_func();

-- Create triggers for refresh_token history
CREATE TRIGGER refresh_token_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON refresh_token
    FOR EACH ROW
    EXECUTE FUNCTION refresh_token_history_trigger_func();

-- Create indexes on history tables for better query performance
CREATE INDEX idx_app_user_history_id ON app_user_history(id);
CREATE INDEX idx_app_user_history_created_date ON app_user_history(history_created_date);
CREATE INDEX idx_platform_admin_history_id ON platform_admin_history(id);
CREATE INDEX idx_platform_admin_history_created_date ON platform_admin_history(history_created_date);
CREATE INDEX idx_refresh_token_history_id ON refresh_token_history(id);
CREATE INDEX idx_refresh_token_history_created_date ON refresh_token_history(history_created_date);

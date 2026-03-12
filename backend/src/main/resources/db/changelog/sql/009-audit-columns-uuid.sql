-- Change created_by / last_modified_by from VARCHAR to UUID on all tables and history tables
-- Default 'system' string is replaced with NULL (system operations won't have a user UUID)

-- app_user
ALTER TABLE app_user
    ALTER COLUMN created_by DROP DEFAULT,
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN created_by SET DEFAULT NULL,
    ALTER COLUMN created_by DROP NOT NULL,
    ALTER COLUMN last_modified_by DROP DEFAULT,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by SET DEFAULT NULL,
    ALTER COLUMN last_modified_by DROP NOT NULL;

ALTER TABLE app_user_history
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL;

-- refresh_token
ALTER TABLE refresh_token
    ALTER COLUMN created_by DROP DEFAULT,
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN created_by SET DEFAULT NULL,
    ALTER COLUMN created_by DROP NOT NULL,
    ALTER COLUMN last_modified_by DROP DEFAULT,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by SET DEFAULT NULL,
    ALTER COLUMN last_modified_by DROP NOT NULL;

ALTER TABLE refresh_token_history
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL;

-- doctor
ALTER TABLE doctor
    ALTER COLUMN created_by DROP DEFAULT,
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN created_by SET DEFAULT NULL,
    ALTER COLUMN created_by DROP NOT NULL,
    ALTER COLUMN last_modified_by DROP DEFAULT,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by SET DEFAULT NULL,
    ALTER COLUMN last_modified_by DROP NOT NULL;

ALTER TABLE doctor_history
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL;

-- patient
ALTER TABLE patient
    ALTER COLUMN created_by DROP DEFAULT,
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN created_by SET DEFAULT NULL,
    ALTER COLUMN created_by DROP NOT NULL,
    ALTER COLUMN last_modified_by DROP DEFAULT,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by SET DEFAULT NULL,
    ALTER COLUMN last_modified_by DROP NOT NULL;

ALTER TABLE patient_history
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL;

-- clinic
ALTER TABLE clinic
    ALTER COLUMN created_by DROP DEFAULT,
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN created_by SET DEFAULT NULL,
    ALTER COLUMN created_by DROP NOT NULL,
    ALTER COLUMN last_modified_by DROP DEFAULT,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by SET DEFAULT NULL,
    ALTER COLUMN last_modified_by DROP NOT NULL;

ALTER TABLE clinic_history
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL;

-- patient_clinic
ALTER TABLE patient_clinic
    ALTER COLUMN created_by DROP DEFAULT,
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN created_by SET DEFAULT NULL,
    ALTER COLUMN created_by DROP NOT NULL,
    ALTER COLUMN last_modified_by DROP DEFAULT,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by SET DEFAULT NULL,
    ALTER COLUMN last_modified_by DROP NOT NULL;

ALTER TABLE patient_clinic_history
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL;

-- request
ALTER TABLE request
    ALTER COLUMN created_by DROP DEFAULT,
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN created_by SET DEFAULT NULL,
    ALTER COLUMN created_by DROP NOT NULL,
    ALTER COLUMN last_modified_by DROP DEFAULT,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by SET DEFAULT NULL,
    ALTER COLUMN last_modified_by DROP NOT NULL;

ALTER TABLE request_history
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL;

-- request_patient
ALTER TABLE request_patient
    ALTER COLUMN created_by DROP DEFAULT,
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN created_by SET DEFAULT NULL,
    ALTER COLUMN created_by DROP NOT NULL,
    ALTER COLUMN last_modified_by DROP DEFAULT,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by SET DEFAULT NULL,
    ALTER COLUMN last_modified_by DROP NOT NULL;

ALTER TABLE request_patient_history
    ALTER COLUMN created_by TYPE UUID USING NULL,
    ALTER COLUMN last_modified_by TYPE UUID USING NULL;

-- Update audit trigger functions to cast the session variable as UUID
CREATE OR REPLACE FUNCTION update_audit_columns_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_setting TEXT;
BEGIN
    NEW.created_date = CURRENT_TIMESTAMP;
    NEW.last_modified_date = CURRENT_TIMESTAMP;
    NEW.version = 1;

    v_setting := current_setting('app.current_user', true);
    IF v_setting IS NOT NULL AND v_setting <> '' THEN
        v_user_id := v_setting::UUID;
        NEW.created_by = v_user_id;
        NEW.last_modified_by = v_user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_audit_columns_update()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_setting TEXT;
BEGIN
    NEW.last_modified_date = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1;
    NEW.created_date = OLD.created_date;
    NEW.created_by = OLD.created_by;

    v_setting := current_setting('app.current_user', true);
    IF v_setting IS NOT NULL AND v_setting <> '' THEN
        v_user_id := v_setting::UUID;
        NEW.last_modified_by = v_user_id;
    ELSE
        NEW.last_modified_by = OLD.last_modified_by;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

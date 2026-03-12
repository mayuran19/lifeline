-- History tables and triggers for domain tables

-- Doctor history
CREATE TABLE doctor_history (
    id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    provider_number VARCHAR(50),
    phone VARCHAR(30),
    email VARCHAR(100),
    active BOOLEAN,
    created_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMPTZ,
    last_modified_by VARCHAR(100),
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Patient history
CREATE TABLE patient_history (
    id UUID,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    phone VARCHAR(30),
    active BOOLEAN,
    created_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMPTZ,
    last_modified_by VARCHAR(100),
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Clinic history
CREATE TABLE clinic_history (
    id UUID,
    name VARCHAR(200),
    address VARCHAR(500),
    phone VARCHAR(30),
    fax VARCHAR(30),
    email VARCHAR(100),
    active BOOLEAN,
    created_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMPTZ,
    last_modified_by VARCHAR(100),
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Patient-clinic history
CREATE TABLE patient_clinic_history (
    id UUID,
    patient_id UUID,
    clinic_id UUID,
    is_current BOOLEAN,
    created_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMPTZ,
    last_modified_by VARCHAR(100),
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Request history
CREATE TABLE request_history (
    id UUID,
    clinic_id UUID,
    doctor_id UUID,
    visit_type visit_type,
    urgency urgency,
    status request_status,
    request_details TEXT,
    received_at TIMESTAMPTZ,
    created_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMPTZ,
    last_modified_by VARCHAR(100),
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Request-patient history
CREATE TABLE request_patient_history (
    id UUID,
    request_id UUID,
    patient_id UUID,
    notes TEXT,
    created_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMPTZ,
    last_modified_by VARCHAR(100),
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger functions

CREATE OR REPLACE FUNCTION doctor_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO doctor_history SELECT OLD.*, 'DELETE', CURRENT_TIMESTAMP;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO doctor_history SELECT NEW.*, 'UPDATE', CURRENT_TIMESTAMP;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO doctor_history SELECT NEW.*, 'INSERT', CURRENT_TIMESTAMP;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION patient_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO patient_history SELECT OLD.*, 'DELETE', CURRENT_TIMESTAMP;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO patient_history SELECT NEW.*, 'UPDATE', CURRENT_TIMESTAMP;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO patient_history SELECT NEW.*, 'INSERT', CURRENT_TIMESTAMP;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clinic_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO clinic_history SELECT OLD.*, 'DELETE', CURRENT_TIMESTAMP;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO clinic_history SELECT NEW.*, 'UPDATE', CURRENT_TIMESTAMP;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO clinic_history SELECT NEW.*, 'INSERT', CURRENT_TIMESTAMP;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION patient_clinic_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO patient_clinic_history SELECT OLD.*, 'DELETE', CURRENT_TIMESTAMP;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO patient_clinic_history SELECT NEW.*, 'UPDATE', CURRENT_TIMESTAMP;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO patient_clinic_history SELECT NEW.*, 'INSERT', CURRENT_TIMESTAMP;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION request_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO request_history SELECT OLD.*, 'DELETE', CURRENT_TIMESTAMP;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO request_history SELECT NEW.*, 'UPDATE', CURRENT_TIMESTAMP;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO request_history SELECT NEW.*, 'INSERT', CURRENT_TIMESTAMP;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION request_patient_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO request_patient_history SELECT OLD.*, 'DELETE', CURRENT_TIMESTAMP;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO request_patient_history SELECT NEW.*, 'UPDATE', CURRENT_TIMESTAMP;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO request_patient_history SELECT NEW.*, 'INSERT', CURRENT_TIMESTAMP;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers

CREATE TRIGGER doctor_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON doctor
    FOR EACH ROW EXECUTE FUNCTION doctor_history_trigger_func();

CREATE TRIGGER patient_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON patient
    FOR EACH ROW EXECUTE FUNCTION patient_history_trigger_func();

CREATE TRIGGER clinic_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON clinic
    FOR EACH ROW EXECUTE FUNCTION clinic_history_trigger_func();

CREATE TRIGGER patient_clinic_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON patient_clinic
    FOR EACH ROW EXECUTE FUNCTION patient_clinic_history_trigger_func();

CREATE TRIGGER request_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON request
    FOR EACH ROW EXECUTE FUNCTION request_history_trigger_func();

CREATE TRIGGER request_patient_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON request_patient
    FOR EACH ROW EXECUTE FUNCTION request_patient_history_trigger_func();

-- Indexes on history tables
CREATE INDEX idx_doctor_history_id ON doctor_history(id);
CREATE INDEX idx_doctor_history_created_date ON doctor_history(history_created_date);
CREATE INDEX idx_patient_history_id ON patient_history(id);
CREATE INDEX idx_patient_history_created_date ON patient_history(history_created_date);
CREATE INDEX idx_clinic_history_id ON clinic_history(id);
CREATE INDEX idx_clinic_history_created_date ON clinic_history(history_created_date);
CREATE INDEX idx_patient_clinic_history_id ON patient_clinic_history(id);
CREATE INDEX idx_patient_clinic_history_created_date ON patient_clinic_history(history_created_date);
CREATE INDEX idx_request_history_id ON request_history(id);
CREATE INDEX idx_request_history_created_date ON request_history(history_created_date);
CREATE INDEX idx_request_patient_history_id ON request_patient_history(id);
CREATE INDEX idx_request_patient_history_created_date ON request_patient_history(history_created_date);

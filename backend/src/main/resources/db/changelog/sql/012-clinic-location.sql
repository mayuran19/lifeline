-- Migration: Clinic locations, emails, and related updates
-- - Remove address/email from clinic (moved to child tables)
-- - Add clinic_location table (multi-location support with Google Places fields)
-- - Add clinic_email table (multiple emails per clinic)
-- - Add clinic_location_email table (multiple emails per location)
-- - Update patient_clinic to optionally reference clinic_location
-- - Update request to optionally reference clinic_location
-- - Update clinic_history to reflect schema change
-- - Add history tables, audit triggers, history triggers for new tables

-- ============================================================
-- 1. Alter clinic table: drop address and email columns
-- ============================================================
ALTER TABLE clinic DROP COLUMN IF EXISTS address;
ALTER TABLE clinic DROP COLUMN IF EXISTS email;

-- ============================================================
-- 2. New table: clinic_location
-- ============================================================
CREATE TABLE clinic_location (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    name VARCHAR(200),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    suburb VARCHAR(100),
    state VARCHAR(50) NOT NULL DEFAULT 'VIC',
    postcode VARCHAR(10),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    place_id VARCHAR(500),
    formatted_address VARCHAR(500),
    manager_name VARCHAR(200),
    care_coordination_name VARCHAR(200),
    phone VARCHAR(30),
    fax VARCHAR(30),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    last_modified_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100) NOT NULL DEFAULT 'system',
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_clinic_location_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id)
);

-- ============================================================
-- 3. New table: clinic_email
-- ============================================================
CREATE TABLE clinic_email (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    email VARCHAR(200) NOT NULL,
    label VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    last_modified_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100) NOT NULL DEFAULT 'system',
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_clinic_email_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id)
);

-- ============================================================
-- 4. New table: clinic_location_email
-- ============================================================
CREATE TABLE clinic_location_email (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_location_id UUID NOT NULL,
    email VARCHAR(200) NOT NULL,
    label VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    last_modified_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100) NOT NULL DEFAULT 'system',
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_clinic_location_email_location FOREIGN KEY (clinic_location_id) REFERENCES clinic_location(id)
);

-- ============================================================
-- 5. Update patient_clinic: add optional clinic_location_id
-- ============================================================
ALTER TABLE patient_clinic ADD COLUMN clinic_location_id UUID;
ALTER TABLE patient_clinic ADD CONSTRAINT fk_patient_clinic_location
    FOREIGN KEY (clinic_location_id) REFERENCES clinic_location(id);

-- ============================================================
-- 6. Update request: add optional clinic_location_id
-- ============================================================
ALTER TABLE request ADD COLUMN clinic_location_id UUID;
ALTER TABLE request ADD CONSTRAINT fk_request_clinic_location
    FOREIGN KEY (clinic_location_id) REFERENCES clinic_location(id);

-- ============================================================
-- 7. Indexes
-- ============================================================
CREATE INDEX idx_clinic_location_clinic_id ON clinic_location(clinic_id);
CREATE INDEX idx_clinic_location_active ON clinic_location(active);
CREATE INDEX idx_clinic_location_is_primary ON clinic_location(is_primary);
CREATE INDEX idx_clinic_location_suburb ON clinic_location(suburb);
CREATE INDEX idx_clinic_email_clinic_id ON clinic_email(clinic_id);
CREATE INDEX idx_clinic_location_email_location_id ON clinic_location_email(clinic_location_id);
CREATE INDEX idx_patient_clinic_location_id ON patient_clinic(clinic_location_id);
CREATE INDEX idx_request_clinic_location_id ON request(clinic_location_id);

-- ============================================================
-- 8. Audit triggers for new tables
-- ============================================================
CREATE TRIGGER clinic_location_audit_insert
    BEFORE INSERT ON clinic_location
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_insert();

CREATE TRIGGER clinic_location_audit_update
    BEFORE UPDATE ON clinic_location
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_update();

CREATE TRIGGER clinic_email_audit_insert
    BEFORE INSERT ON clinic_email
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_insert();

CREATE TRIGGER clinic_email_audit_update
    BEFORE UPDATE ON clinic_email
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_update();

CREATE TRIGGER clinic_location_email_audit_insert
    BEFORE INSERT ON clinic_location_email
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_insert();

CREATE TRIGGER clinic_location_email_audit_update
    BEFORE UPDATE ON clinic_location_email
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_update();

-- ============================================================
-- 9. History tables for new tables
-- ============================================================

CREATE TABLE clinic_location_history (
    id UUID,
    clinic_id UUID,
    name VARCHAR(200),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    suburb VARCHAR(100),
    state VARCHAR(50),
    postcode VARCHAR(10),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    place_id VARCHAR(500),
    formatted_address VARCHAR(500),
    manager_name VARCHAR(200),
    care_coordination_name VARCHAR(200),
    phone VARCHAR(30),
    fax VARCHAR(30),
    is_primary BOOLEAN,
    active BOOLEAN,
    created_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMPTZ,
    last_modified_by VARCHAR(100),
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinic_email_history (
    id UUID,
    clinic_id UUID,
    email VARCHAR(200),
    label VARCHAR(100),
    is_primary BOOLEAN,
    created_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMPTZ,
    last_modified_by VARCHAR(100),
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinic_location_email_history (
    id UUID,
    clinic_location_id UUID,
    email VARCHAR(200),
    label VARCHAR(100),
    is_primary BOOLEAN,
    created_date TIMESTAMPTZ,
    created_by VARCHAR(100),
    last_modified_date TIMESTAMPTZ,
    last_modified_by VARCHAR(100),
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 10. History trigger functions for new tables
-- ============================================================

CREATE OR REPLACE FUNCTION clinic_location_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO clinic_location_history (id, clinic_id, name, address_line1, address_line2, suburb, state, postcode, latitude, longitude, place_id, formatted_address, manager_name, care_coordination_name, phone, fax, is_primary, active, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (OLD.id, OLD.clinic_id, OLD.name, OLD.address_line1, OLD.address_line2, OLD.suburb, OLD.state, OLD.postcode, OLD.latitude, OLD.longitude, OLD.place_id, OLD.formatted_address, OLD.manager_name, OLD.care_coordination_name, OLD.phone, OLD.fax, OLD.is_primary, OLD.active, OLD.created_date, OLD.created_by, OLD.last_modified_date, OLD.last_modified_by, OLD.version, 'DELETE', CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO clinic_location_history (id, clinic_id, name, address_line1, address_line2, suburb, state, postcode, latitude, longitude, place_id, formatted_address, manager_name, care_coordination_name, phone, fax, is_primary, active, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.clinic_id, NEW.name, NEW.address_line1, NEW.address_line2, NEW.suburb, NEW.state, NEW.postcode, NEW.latitude, NEW.longitude, NEW.place_id, NEW.formatted_address, NEW.manager_name, NEW.care_coordination_name, NEW.phone, NEW.fax, NEW.is_primary, NEW.active, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'UPDATE', CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO clinic_location_history (id, clinic_id, name, address_line1, address_line2, suburb, state, postcode, latitude, longitude, place_id, formatted_address, manager_name, care_coordination_name, phone, fax, is_primary, active, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.clinic_id, NEW.name, NEW.address_line1, NEW.address_line2, NEW.suburb, NEW.state, NEW.postcode, NEW.latitude, NEW.longitude, NEW.place_id, NEW.formatted_address, NEW.manager_name, NEW.care_coordination_name, NEW.phone, NEW.fax, NEW.is_primary, NEW.active, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'INSERT', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clinic_email_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO clinic_email_history (id, clinic_id, email, label, is_primary, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (OLD.id, OLD.clinic_id, OLD.email, OLD.label, OLD.is_primary, OLD.created_date, OLD.created_by, OLD.last_modified_date, OLD.last_modified_by, OLD.version, 'DELETE', CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO clinic_email_history (id, clinic_id, email, label, is_primary, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.clinic_id, NEW.email, NEW.label, NEW.is_primary, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'UPDATE', CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO clinic_email_history (id, clinic_id, email, label, is_primary, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.clinic_id, NEW.email, NEW.label, NEW.is_primary, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'INSERT', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION clinic_location_email_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO clinic_location_email_history (id, clinic_location_id, email, label, is_primary, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (OLD.id, OLD.clinic_location_id, OLD.email, OLD.label, OLD.is_primary, OLD.created_date, OLD.created_by, OLD.last_modified_date, OLD.last_modified_by, OLD.version, 'DELETE', CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO clinic_location_email_history (id, clinic_location_id, email, label, is_primary, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.clinic_location_id, NEW.email, NEW.label, NEW.is_primary, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'UPDATE', CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO clinic_location_email_history (id, clinic_location_id, email, label, is_primary, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.clinic_location_id, NEW.email, NEW.label, NEW.is_primary, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'INSERT', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 11. History triggers for new tables
-- ============================================================

CREATE TRIGGER clinic_location_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON clinic_location
    FOR EACH ROW EXECUTE FUNCTION clinic_location_history_trigger_func();

CREATE TRIGGER clinic_email_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON clinic_email
    FOR EACH ROW EXECUTE FUNCTION clinic_email_history_trigger_func();

CREATE TRIGGER clinic_location_email_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON clinic_location_email
    FOR EACH ROW EXECUTE FUNCTION clinic_location_email_history_trigger_func();

-- ============================================================
-- 12. History table indexes
-- ============================================================
CREATE INDEX idx_clinic_location_history_id ON clinic_location_history(id);
CREATE INDEX idx_clinic_location_history_created_date ON clinic_location_history(history_created_date);
CREATE INDEX idx_clinic_email_history_id ON clinic_email_history(id);
CREATE INDEX idx_clinic_email_history_created_date ON clinic_email_history(history_created_date);
CREATE INDEX idx_clinic_location_email_history_id ON clinic_location_email_history(id);
CREATE INDEX idx_clinic_location_email_history_created_date ON clinic_location_email_history(history_created_date);

-- ============================================================
-- 13. Update clinic_history: drop address and email columns
-- ============================================================
ALTER TABLE clinic_history DROP COLUMN IF EXISTS address;
ALTER TABLE clinic_history DROP COLUMN IF EXISTS email;

-- ============================================================
-- 14. Update clinic_history_trigger_func to exclude dropped columns
-- ============================================================
CREATE OR REPLACE FUNCTION clinic_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO clinic_history (id, name, phone, fax, active, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (OLD.id, OLD.name, OLD.phone, OLD.fax, OLD.active, OLD.created_date, OLD.created_by, OLD.last_modified_date, OLD.last_modified_by, OLD.version, 'DELETE', CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO clinic_history (id, name, phone, fax, active, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.name, NEW.phone, NEW.fax, NEW.active, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'UPDATE', CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO clinic_history (id, name, phone, fax, active, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.name, NEW.phone, NEW.fax, NEW.active, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'INSERT', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 15. Update patient_clinic_history: add clinic_location_id column
-- ============================================================
ALTER TABLE patient_clinic_history ADD COLUMN clinic_location_id UUID;

-- ============================================================
-- 16. Update patient_clinic_history_trigger_func to include clinic_location_id
-- ============================================================
CREATE OR REPLACE FUNCTION patient_clinic_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO patient_clinic_history (id, patient_id, clinic_id, clinic_location_id, is_current, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (OLD.id, OLD.patient_id, OLD.clinic_id, OLD.clinic_location_id, OLD.is_current, OLD.created_date, OLD.created_by, OLD.last_modified_date, OLD.last_modified_by, OLD.version, 'DELETE', CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO patient_clinic_history (id, patient_id, clinic_id, clinic_location_id, is_current, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.patient_id, NEW.clinic_id, NEW.clinic_location_id, NEW.is_current, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'UPDATE', CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO patient_clinic_history (id, patient_id, clinic_id, clinic_location_id, is_current, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.patient_id, NEW.clinic_id, NEW.clinic_location_id, NEW.is_current, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'INSERT', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 17. Update request_history: add clinic_location_id column
-- ============================================================
ALTER TABLE request_history ADD COLUMN clinic_location_id UUID;

-- ============================================================
-- 18. Update request_history_trigger_func to include clinic_location_id
-- ============================================================
CREATE OR REPLACE FUNCTION request_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO request_history (id, clinic_id, clinic_location_id, doctor_id, visit_type, urgency, status, request_details, received_at, created_date, created_by, last_modified_date, last_modified_by, version, start_time, end_time, dml_type, history_created_date)
        VALUES (OLD.id, OLD.clinic_id, OLD.clinic_location_id, OLD.doctor_id, OLD.visit_type, OLD.urgency, OLD.status, OLD.request_details, OLD.received_at, OLD.created_date, OLD.created_by, OLD.last_modified_date, OLD.last_modified_by, OLD.version, OLD.start_time, OLD.end_time, 'DELETE', CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO request_history (id, clinic_id, clinic_location_id, doctor_id, visit_type, urgency, status, request_details, received_at, created_date, created_by, last_modified_date, last_modified_by, version, start_time, end_time, dml_type, history_created_date)
        VALUES (NEW.id, NEW.clinic_id, NEW.clinic_location_id, NEW.doctor_id, NEW.visit_type, NEW.urgency, NEW.status, NEW.request_details, NEW.received_at, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, NEW.start_time, NEW.end_time, 'UPDATE', CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO request_history (id, clinic_id, clinic_location_id, doctor_id, visit_type, urgency, status, request_details, received_at, created_date, created_by, last_modified_date, last_modified_by, version, start_time, end_time, dml_type, history_created_date)
        VALUES (NEW.id, NEW.clinic_id, NEW.clinic_location_id, NEW.doctor_id, NEW.visit_type, NEW.urgency, NEW.status, NEW.request_details, NEW.received_at, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, NEW.start_time, NEW.end_time, 'INSERT', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
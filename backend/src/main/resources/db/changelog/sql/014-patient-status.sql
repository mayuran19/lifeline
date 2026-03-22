-- Migration: Extend patient table with status, medicare_no, irn_no

-- New enum for patient status
CREATE TYPE patient_status AS ENUM ('ACTIVE', 'INACTIVE', 'DECEASED');

-- Add new columns
ALTER TABLE patient
    ADD COLUMN status patient_status NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN status_reason TEXT,
    ADD COLUMN deceased_date DATE,
    ADD COLUMN medicare_no VARCHAR(50),
    ADD COLUMN irn_no VARCHAR(50);

-- Migrate existing active boolean → status
UPDATE patient SET status = CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END::patient_status;

-- Drop old active column
ALTER TABLE patient DROP COLUMN active;

-- Update patient_history table to match
ALTER TABLE patient_history
    ADD COLUMN status patient_status,
    ADD COLUMN status_reason TEXT,
    ADD COLUMN deceased_date DATE,
    ADD COLUMN medicare_no VARCHAR(50),
    ADD COLUMN irn_no VARCHAR(50);

ALTER TABLE patient_history DROP COLUMN IF EXISTS active;

-- Update patient_history trigger function
CREATE OR REPLACE FUNCTION patient_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO patient_history (id, first_name, last_name, date_of_birth, phone, status, status_reason, deceased_date, medicare_no, irn_no, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (OLD.id, OLD.first_name, OLD.last_name, OLD.date_of_birth, OLD.phone, OLD.status, OLD.status_reason, OLD.deceased_date, OLD.medicare_no, OLD.irn_no, OLD.created_date, OLD.created_by, OLD.last_modified_date, OLD.last_modified_by, OLD.version, 'DELETE', CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO patient_history (id, first_name, last_name, date_of_birth, phone, status, status_reason, deceased_date, medicare_no, irn_no, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.first_name, NEW.last_name, NEW.date_of_birth, NEW.phone, NEW.status, NEW.status_reason, NEW.deceased_date, NEW.medicare_no, NEW.irn_no, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'UPDATE', CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO patient_history (id, first_name, last_name, date_of_birth, phone, status, status_reason, deceased_date, medicare_no, irn_no, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.first_name, NEW.last_name, NEW.date_of_birth, NEW.phone, NEW.status, NEW.status_reason, NEW.deceased_date, NEW.medicare_no, NEW.irn_no, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'INSERT', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add index on status
CREATE INDEX idx_patient_status ON patient(status);

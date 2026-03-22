-- Migration: Add remark column to patient (always-visible generic notes, separate from status_reason)

ALTER TABLE patient ADD COLUMN remark TEXT;
ALTER TABLE patient_history ADD COLUMN remark TEXT;

-- Update patient_history trigger function to include remark
CREATE OR REPLACE FUNCTION patient_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO patient_history (id, first_name, last_name, date_of_birth, phone, status, status_reason, deceased_date, medicare_no, irn_no, remark, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (OLD.id, OLD.first_name, OLD.last_name, OLD.date_of_birth, OLD.phone, OLD.status, OLD.status_reason, OLD.deceased_date, OLD.medicare_no, OLD.irn_no, OLD.remark, OLD.created_date, OLD.created_by, OLD.last_modified_date, OLD.last_modified_by, OLD.version, 'DELETE', CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO patient_history (id, first_name, last_name, date_of_birth, phone, status, status_reason, deceased_date, medicare_no, irn_no, remark, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.first_name, NEW.last_name, NEW.date_of_birth, NEW.phone, NEW.status, NEW.status_reason, NEW.deceased_date, NEW.medicare_no, NEW.irn_no, NEW.remark, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'UPDATE', CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO patient_history (id, first_name, last_name, date_of_birth, phone, status, status_reason, deceased_date, medicare_no, irn_no, remark, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.first_name, NEW.last_name, NEW.date_of_birth, NEW.phone, NEW.status, NEW.status_reason, NEW.deceased_date, NEW.medicare_no, NEW.irn_no, NEW.remark, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'INSERT', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

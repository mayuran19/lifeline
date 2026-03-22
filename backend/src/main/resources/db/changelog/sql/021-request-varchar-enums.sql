-- Migration: Convert request enum columns to VARCHAR (enables DB-driven configuration)

-- Convert request table
ALTER TABLE request
    ALTER COLUMN visit_type TYPE VARCHAR(100) USING visit_type::TEXT,
    ALTER COLUMN urgency TYPE VARCHAR(100) USING urgency::TEXT,
    ALTER COLUMN status TYPE VARCHAR(100) USING status::TEXT;

ALTER TABLE request
    ALTER COLUMN visit_type SET DEFAULT 'ROUTINE_ROUND',
    ALTER COLUMN urgency SET DEFAULT 'ROUTINE',
    ALTER COLUMN status SET DEFAULT 'RECEIVED';

-- Convert request_history table
ALTER TABLE request_history
    ALTER COLUMN visit_type TYPE VARCHAR(100) USING visit_type::TEXT,
    ALTER COLUMN urgency TYPE VARCHAR(100) USING urgency::TEXT,
    ALTER COLUMN status TYPE VARCHAR(100) USING status::TEXT;

-- Drop the PostgreSQL enum types (no longer needed)
DROP TYPE IF EXISTS visit_type;
DROP TYPE IF EXISTS urgency;
DROP TYPE IF EXISTS request_status;

-- Rewrite request_history trigger function for VARCHAR columns
CREATE OR REPLACE FUNCTION request_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO request_history (id, clinic_id, clinic_location_id, doctor_id, entered_by, visit_type, urgency, status, request_details, received_at, start_time, end_time, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (OLD.id, OLD.clinic_id, OLD.clinic_location_id, OLD.doctor_id, OLD.entered_by, OLD.visit_type, OLD.urgency, OLD.status, OLD.request_details, OLD.received_at, OLD.start_time, OLD.end_time, OLD.created_date, OLD.created_by, OLD.last_modified_date, OLD.last_modified_by, OLD.version, 'DELETE', CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO request_history (id, clinic_id, clinic_location_id, doctor_id, entered_by, visit_type, urgency, status, request_details, received_at, start_time, end_time, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.clinic_id, NEW.clinic_location_id, NEW.doctor_id, NEW.entered_by, NEW.visit_type, NEW.urgency, NEW.status, NEW.request_details, NEW.received_at, NEW.start_time, NEW.end_time, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'UPDATE', CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO request_history (id, clinic_id, clinic_location_id, doctor_id, entered_by, visit_type, urgency, status, request_details, received_at, start_time, end_time, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.clinic_id, NEW.clinic_location_id, NEW.doctor_id, NEW.entered_by, NEW.visit_type, NEW.urgency, NEW.status, NEW.request_details, NEW.received_at, NEW.start_time, NEW.end_time, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'INSERT', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

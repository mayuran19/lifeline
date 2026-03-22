-- Migration: Add entered_by to request (user who entered the request, separate from created_by audit)

ALTER TABLE request ADD COLUMN entered_by UUID;
ALTER TABLE request ADD CONSTRAINT fk_request_entered_by FOREIGN KEY (entered_by) REFERENCES app_user(id);

ALTER TABLE request_history ADD COLUMN entered_by UUID;

-- Recreate request_history trigger to include entered_by and clinic_location_id
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

CREATE INDEX idx_request_entered_by ON request(entered_by);

-- Migration: Add prescriber_no to doctor, create doctor_clinic multi-association table

-- Add prescriber_no column to doctor
ALTER TABLE doctor ADD COLUMN prescriber_no VARCHAR(50);
ALTER TABLE doctor_history ADD COLUMN prescriber_no VARCHAR(50);

-- Recreate doctor_history trigger function with explicit columns (includes prescriber_no)
CREATE OR REPLACE FUNCTION doctor_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO doctor_history (id, first_name, last_name, provider_number, prescriber_no, phone, email, active, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (OLD.id, OLD.first_name, OLD.last_name, OLD.provider_number, OLD.prescriber_no, OLD.phone, OLD.email, OLD.active, OLD.created_date, OLD.created_by, OLD.last_modified_date, OLD.last_modified_by, OLD.version, 'DELETE', CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO doctor_history (id, first_name, last_name, provider_number, prescriber_no, phone, email, active, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.first_name, NEW.last_name, NEW.provider_number, NEW.prescriber_no, NEW.phone, NEW.email, NEW.active, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'UPDATE', CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO doctor_history (id, first_name, last_name, provider_number, prescriber_no, phone, email, active, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.first_name, NEW.last_name, NEW.provider_number, NEW.prescriber_no, NEW.phone, NEW.email, NEW.active, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'INSERT', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Doctor-Clinic association: one doctor → many clinic+location pairs
CREATE TABLE doctor_clinic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL,
    clinic_id UUID NOT NULL,
    clinic_location_id UUID,
    active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_doctor_clinic_doctor FOREIGN KEY (doctor_id) REFERENCES doctor(id),
    CONSTRAINT fk_doctor_clinic_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id),
    CONSTRAINT fk_doctor_clinic_location FOREIGN KEY (clinic_location_id) REFERENCES clinic_location(id),
    CONSTRAINT uq_doctor_clinic_location UNIQUE (doctor_id, clinic_id, clinic_location_id)
);

-- History table for doctor_clinic
CREATE TABLE doctor_clinic_history (
    id UUID,
    doctor_id UUID,
    clinic_id UUID,
    clinic_location_id UUID,
    active BOOLEAN,
    created_date TIMESTAMPTZ,
    created_by UUID,
    last_modified_date TIMESTAMPTZ,
    last_modified_by UUID,
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION doctor_clinic_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO doctor_clinic_history (id, doctor_id, clinic_id, clinic_location_id, active, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (OLD.id, OLD.doctor_id, OLD.clinic_id, OLD.clinic_location_id, OLD.active, OLD.created_date, OLD.created_by, OLD.last_modified_date, OLD.last_modified_by, OLD.version, 'DELETE', CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO doctor_clinic_history (id, doctor_id, clinic_id, clinic_location_id, active, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.doctor_id, NEW.clinic_id, NEW.clinic_location_id, NEW.active, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'UPDATE', CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO doctor_clinic_history (id, doctor_id, clinic_id, clinic_location_id, active, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.doctor_id, NEW.clinic_id, NEW.clinic_location_id, NEW.active, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'INSERT', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER doctor_clinic_history_trigger
    AFTER INSERT OR UPDATE OR DELETE ON doctor_clinic
    FOR EACH ROW EXECUTE FUNCTION doctor_clinic_history_trigger_func();

-- Indexes
CREATE INDEX idx_doctor_clinic_doctor_id ON doctor_clinic(doctor_id);
CREATE INDEX idx_doctor_clinic_clinic_id ON doctor_clinic(clinic_id);
CREATE INDEX idx_doctor_clinic_active ON doctor_clinic(active);
CREATE INDEX idx_doctor_clinic_history_id ON doctor_clinic_history(id);

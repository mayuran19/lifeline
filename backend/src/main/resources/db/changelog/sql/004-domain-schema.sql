-- Enums
CREATE TYPE visit_type AS ENUM ('ROUTINE_ROUND', 'URGENT', 'AFTER_HOURS', 'PHONE_CONSULT');
CREATE TYPE urgency AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY');
CREATE TYPE request_status AS ENUM ('RECEIVED', 'IN_PROGRESS', 'COMPLETED');

-- Doctor table
CREATE TABLE doctor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    provider_number VARCHAR(50),
    phone VARCHAR(30),
    email VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    last_modified_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100) NOT NULL DEFAULT 'system',
    version INTEGER NOT NULL DEFAULT 1
);

-- Patient table
CREATE TABLE patient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    phone VARCHAR(30),
    active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    last_modified_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100) NOT NULL DEFAULT 'system',
    version INTEGER NOT NULL DEFAULT 1
);

-- Clinic table
CREATE TABLE clinic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    address VARCHAR(500),
    phone VARCHAR(30),
    fax VARCHAR(30),
    email VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    last_modified_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100) NOT NULL DEFAULT 'system',
    version INTEGER NOT NULL DEFAULT 1
);

-- Patient-Clinic soft association (for suggestion purposes only)
CREATE TABLE patient_clinic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    clinic_id UUID NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    last_modified_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100) NOT NULL DEFAULT 'system',
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_patient_clinic_patient FOREIGN KEY (patient_id) REFERENCES patient(id),
    CONSTRAINT fk_patient_clinic_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id)
);

-- Request (call log entry)
CREATE TABLE request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    doctor_id UUID,
    visit_type visit_type NOT NULL,
    urgency urgency NOT NULL DEFAULT 'ROUTINE',
    status request_status NOT NULL DEFAULT 'RECEIVED',
    request_details TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    last_modified_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100) NOT NULL DEFAULT 'system',
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_request_clinic FOREIGN KEY (clinic_id) REFERENCES clinic(id),
    CONSTRAINT fk_request_doctor FOREIGN KEY (doctor_id) REFERENCES doctor(id)
);

-- Patients on a request
CREATE TABLE request_patient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    notes TEXT,
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    last_modified_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by VARCHAR(100) NOT NULL DEFAULT 'system',
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_request_patient_request FOREIGN KEY (request_id) REFERENCES request(id) ON DELETE CASCADE,
    CONSTRAINT fk_request_patient_patient FOREIGN KEY (patient_id) REFERENCES patient(id),
    CONSTRAINT uq_request_patient UNIQUE (request_id, patient_id)
);

-- Indexes
CREATE INDEX idx_doctor_last_name ON doctor(last_name);
CREATE INDEX idx_doctor_active ON doctor(active);
CREATE INDEX idx_patient_last_name ON patient(last_name);
CREATE INDEX idx_patient_active ON patient(active);
CREATE INDEX idx_clinic_name ON clinic(name);
CREATE INDEX idx_clinic_active ON clinic(active);
CREATE INDEX idx_patient_clinic_patient_id ON patient_clinic(patient_id);
CREATE INDEX idx_patient_clinic_clinic_id ON patient_clinic(clinic_id);
CREATE INDEX idx_patient_clinic_current ON patient_clinic(is_current);
CREATE INDEX idx_request_clinic_id ON request(clinic_id);
CREATE INDEX idx_request_doctor_id ON request(doctor_id);
CREATE INDEX idx_request_status ON request(status);
CREATE INDEX idx_request_received_at ON request(received_at);
CREATE INDEX idx_request_urgency ON request(urgency);
CREATE INDEX idx_request_patient_request_id ON request_patient(request_id);
CREATE INDEX idx_request_patient_patient_id ON request_patient(patient_id);

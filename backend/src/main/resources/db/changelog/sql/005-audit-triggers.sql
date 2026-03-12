-- Audit triggers for domain tables (doctor, patient, clinic, patient_clinic, request, request_patient)
-- Reuses the shared trigger functions defined in 002-audit-triggers.sql

CREATE TRIGGER doctor_audit_insert
    BEFORE INSERT ON doctor
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_insert();

CREATE TRIGGER doctor_audit_update
    BEFORE UPDATE ON doctor
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_update();

CREATE TRIGGER patient_audit_insert
    BEFORE INSERT ON patient
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_insert();

CREATE TRIGGER patient_audit_update
    BEFORE UPDATE ON patient
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_update();

CREATE TRIGGER clinic_audit_insert
    BEFORE INSERT ON clinic
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_insert();

CREATE TRIGGER clinic_audit_update
    BEFORE UPDATE ON clinic
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_update();

CREATE TRIGGER patient_clinic_audit_insert
    BEFORE INSERT ON patient_clinic
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_insert();

CREATE TRIGGER patient_clinic_audit_update
    BEFORE UPDATE ON patient_clinic
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_update();

CREATE TRIGGER request_audit_insert
    BEFORE INSERT ON request
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_insert();

CREATE TRIGGER request_audit_update
    BEFORE UPDATE ON request
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_update();

CREATE TRIGGER request_patient_audit_insert
    BEFORE INSERT ON request_patient
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_insert();

CREATE TRIGGER request_patient_audit_update
    BEFORE UPDATE ON request_patient
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_columns_update();

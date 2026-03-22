-- Migration: Configuration table for dynamic dropdown values (visit_type, urgency, request_status)

CREATE TABLE configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_group VARCHAR(100) NOT NULL,
    group_display_order INT NOT NULL DEFAULT 0,
    config_key VARCHAR(100) NOT NULL,
    config_description VARCHAR(500),
    config_display_order INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_modified_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_modified_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT uq_configuration_group_key UNIQUE (config_group, config_key),
    CONSTRAINT chk_configuration_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE configuration_history (
    id UUID,
    config_group VARCHAR(100),
    group_display_order INT,
    config_key VARCHAR(100),
    config_description VARCHAR(500),
    config_display_order INT,
    status VARCHAR(20),
    created_date TIMESTAMPTZ,
    created_by UUID,
    last_modified_date TIMESTAMPTZ,
    last_modified_by UUID,
    version INTEGER,
    dml_type VARCHAR(10) NOT NULL,
    history_created_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit trigger (updates last_modified_date, version)
CREATE OR REPLACE FUNCTION configuration_audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified_date = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER configuration_audit_trigger
BEFORE UPDATE ON configuration
FOR EACH ROW EXECUTE FUNCTION configuration_audit_trigger_func();

-- History trigger
CREATE OR REPLACE FUNCTION configuration_history_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO configuration_history (id, config_group, group_display_order, config_key, config_description, config_display_order, status, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (OLD.id, OLD.config_group, OLD.group_display_order, OLD.config_key, OLD.config_description, OLD.config_display_order, OLD.status, OLD.created_date, OLD.created_by, OLD.last_modified_date, OLD.last_modified_by, OLD.version, 'DELETE', CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO configuration_history (id, config_group, group_display_order, config_key, config_description, config_display_order, status, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.config_group, NEW.group_display_order, NEW.config_key, NEW.config_description, NEW.config_display_order, NEW.status, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'UPDATE', CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO configuration_history (id, config_group, group_display_order, config_key, config_description, config_display_order, status, created_date, created_by, last_modified_date, last_modified_by, version, dml_type, history_created_date)
        VALUES (NEW.id, NEW.config_group, NEW.group_display_order, NEW.config_key, NEW.config_description, NEW.config_display_order, NEW.status, NEW.created_date, NEW.created_by, NEW.last_modified_date, NEW.last_modified_by, NEW.version, 'INSERT', CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER configuration_history_trigger
AFTER INSERT OR UPDATE OR DELETE ON configuration
FOR EACH ROW EXECUTE FUNCTION configuration_history_trigger_func();

-- Seed data: VISIT_TYPE
INSERT INTO configuration (config_group, group_display_order, config_key, config_description, config_display_order, status)
VALUES
    ('VISIT_TYPE', 1, 'ROUTINE_ROUND', 'Routine Round', 1, 'ACTIVE'),
    ('VISIT_TYPE', 1, 'URGENT',        'Urgent',        2, 'ACTIVE'),
    ('VISIT_TYPE', 1, 'AFTER_HOURS',   'After Hours',   3, 'ACTIVE'),
    ('VISIT_TYPE', 1, 'PHONE_CONSULT', 'Phone Consult', 4, 'ACTIVE');

-- Seed data: URGENCY
INSERT INTO configuration (config_group, group_display_order, config_key, config_description, config_display_order, status)
VALUES
    ('URGENCY', 2, 'ROUTINE',   'Routine',   1, 'ACTIVE'),
    ('URGENCY', 2, 'URGENT',    'Urgent',    2, 'ACTIVE'),
    ('URGENCY', 2, 'EMERGENCY', 'Emergency', 3, 'ACTIVE');

-- Seed data: REQUEST_STATUS
INSERT INTO configuration (config_group, group_display_order, config_key, config_description, config_display_order, status)
VALUES
    ('REQUEST_STATUS', 3, 'RECEIVED',    'Received',    1, 'ACTIVE'),
    ('REQUEST_STATUS', 3, 'IN_PROGRESS', 'In Progress', 2, 'ACTIVE'),
    ('REQUEST_STATUS', 3, 'COMPLETED',   'Completed',   3, 'ACTIVE');

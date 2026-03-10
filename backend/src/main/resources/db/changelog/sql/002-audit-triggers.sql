-- Function to update audit columns on INSERT
CREATE OR REPLACE FUNCTION update_audit_columns_insert()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_date = CURRENT_TIMESTAMP;
    NEW.last_modified_date = CURRENT_TIMESTAMP;
    NEW.version = 1;

    -- Set created_by from session if available, otherwise keep default
    IF current_setting('app.current_user', true) IS NOT NULL THEN
        NEW.created_by = current_setting('app.current_user', true);
        NEW.last_modified_by = current_setting('app.current_user', true);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update audit columns on UPDATE
CREATE OR REPLACE FUNCTION update_audit_columns_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_modified_date = CURRENT_TIMESTAMP;
    NEW.version = OLD.version + 1;

    -- Preserve created_date and created_by
    NEW.created_date = OLD.created_date;
    NEW.created_by = OLD.created_by;

    -- Set last_modified_by from session if available
    IF current_setting('app.current_user', true) IS NOT NULL THEN
        NEW.last_modified_by = current_setting('app.current_user', true);
    ELSE
        NEW.last_modified_by = OLD.last_modified_by;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for your tables here
-- Example:
-- CREATE TRIGGER your_table_audit_insert
--     BEFORE INSERT ON your_table
--     FOR EACH ROW
--     EXECUTE FUNCTION update_audit_columns_insert();
--
-- CREATE TRIGGER your_table_audit_update
--     BEFORE UPDATE ON your_table
--     FOR EACH ROW
--     EXECUTE FUNCTION update_audit_columns_update();

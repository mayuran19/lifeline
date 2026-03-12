ALTER TABLE request
    ADD COLUMN start_time TIMESTAMPTZ,
    ADD COLUMN end_time TIMESTAMPTZ;

ALTER TABLE request_history
    ADD COLUMN start_time TIMESTAMPTZ,
    ADD COLUMN end_time TIMESTAMPTZ;

CREATE INDEX idx_request_start_time ON request(start_time);

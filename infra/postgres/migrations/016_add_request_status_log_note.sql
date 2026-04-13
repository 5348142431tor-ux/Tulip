ALTER TABLE request_status_logs
ADD COLUMN IF NOT EXISTS note TEXT;

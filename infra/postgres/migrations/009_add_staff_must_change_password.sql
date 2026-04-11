ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE staff
SET must_change_password = FALSE
WHERE must_change_password IS DISTINCT FROM FALSE;

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS login TEXT;

UPDATE staff
SET login = code
WHERE COALESCE(login, '') = '';

ALTER TABLE staff
  ALTER COLUMN login SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_login_unique'
  ) THEN
    ALTER TABLE staff
      ADD CONSTRAINT staff_login_unique UNIQUE (login);
  END IF;
END $$;

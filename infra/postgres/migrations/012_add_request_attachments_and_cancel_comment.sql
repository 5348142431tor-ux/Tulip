ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS cancel_comment TEXT;

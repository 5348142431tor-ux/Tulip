ALTER TABLE requests
ADD COLUMN IF NOT EXISTS client_decision_pending BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS request_rework_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  comment_number INTEGER NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, comment_number)
);

CREATE INDEX IF NOT EXISTS idx_request_rework_comments_request ON request_rework_comments(request_id, comment_number);

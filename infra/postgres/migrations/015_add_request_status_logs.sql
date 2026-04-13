CREATE TABLE IF NOT EXISTS request_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  actor_role TEXT,
  actor_name TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_status_logs_request ON request_status_logs(request_id, changed_at);

INSERT INTO request_status_logs (request_id, status, actor_role, actor_name, changed_at)
SELECT r.id, r.status, NULL, NULL, r.created_at
FROM requests r
WHERE NOT EXISTS (
  SELECT 1 FROM request_status_logs sl WHERE sl.request_id = r.id
);

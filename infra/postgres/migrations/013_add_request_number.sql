ALTER TABLE requests
ADD COLUMN IF NOT EXISTS request_number BIGINT;

CREATE SEQUENCE IF NOT EXISTS requests_request_number_seq;

ALTER SEQUENCE requests_request_number_seq OWNED BY requests.request_number;

ALTER TABLE requests
ALTER COLUMN request_number SET DEFAULT nextval('requests_request_number_seq');

WITH ordered_requests AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, code ASC) AS seq_number
  FROM requests
  WHERE request_number IS NULL
)
UPDATE requests
SET request_number = ordered_requests.seq_number
FROM ordered_requests
WHERE requests.id = ordered_requests.id;

SELECT setval(
  'requests_request_number_seq',
  GREATEST((SELECT COALESCE(MAX(request_number), 0) FROM requests), 1),
  true
);

ALTER TABLE requests
ALTER COLUMN request_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_request_number ON requests(request_number);

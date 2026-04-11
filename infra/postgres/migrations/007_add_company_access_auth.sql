ALTER TABLE management_companies
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS company_access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE CASCADE,
  access_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (management_company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_access_links_company
  ON company_access_links(management_company_id);

CREATE INDEX IF NOT EXISTS idx_company_access_links_status
  ON company_access_links(status);

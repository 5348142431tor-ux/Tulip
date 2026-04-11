CREATE TABLE IF NOT EXISTS client_access_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  access_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_client_access_links_client
  ON client_access_links(client_id);

CREATE INDEX IF NOT EXISTS idx_client_access_links_unit
  ON client_access_links(unit_id);

CREATE INDEX IF NOT EXISTS idx_client_access_links_status
  ON client_access_links(status);

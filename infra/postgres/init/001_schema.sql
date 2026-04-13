CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS management_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  director_name TEXT,
  country_code TEXT NOT NULL DEFAULT 'TR',
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  login TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  telegram_id TEXT,
  password_hash TEXT,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  can_record_client_payments BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  login TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  client_type TEXT NOT NULL DEFAULT 'owner',
  phone TEXT,
  email TEXT,
  telegram_username TEXT,
  telegram_id TEXT,
  language_code TEXT NOT NULL DEFAULT 'ru',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  address_line TEXT,
  property_type TEXT NOT NULL DEFAULT 'residential_building',
  aidat_calculation_mode TEXT NOT NULL DEFAULT 'equal_for_all',
  aidat_start_date DATE,
  aidat_fixed_amount NUMERIC(12,2),
  aidat_currency_code TEXT NOT NULL DEFAULT 'TRY',
  status TEXT NOT NULL DEFAULT 'active',
  unit_count INTEGER NOT NULL DEFAULT 1 CHECK (unit_count > 0),
  manager_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  unit_number TEXT NOT NULL,
  floor_label TEXT,
  area_sqm NUMERIC(10,2) NOT NULL DEFAULT 0,
  layout_type TEXT,
  layout_feature TEXT,
  water_account_number TEXT,
  electricity_account_number TEXT,
  resident_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, unit_number)
);

CREATE TABLE IF NOT EXISTS ownerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  ownership_share NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_id, client_id)
);

CREATE TABLE IF NOT EXISTS unit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  currency_code TEXT NOT NULL DEFAULT 'TRY',
  outstanding_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  prepaid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_id, currency_code)
);

CREATE TABLE IF NOT EXISTS charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  charge_period DATE NOT NULL,
  charge_type TEXT NOT NULL,
  amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'TRY',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'unpaid',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number BIGSERIAL NOT NULL UNIQUE,
  management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'admin',
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'low',
  status TEXT NOT NULL DEFAULT 'new',
  client_decision_pending BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS request_rework_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  comment_number INTEGER NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, comment_number)
);

CREATE TABLE IF NOT EXISTS request_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  actor_role TEXT,
  actor_name TEXT,
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  storage_url TEXT,
  visibility_scope TEXT NOT NULL DEFAULT 'internal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  management_company_id UUID NOT NULL REFERENCES management_companies(id) ON DELETE RESTRICT,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_company ON properties(management_company_id);
CREATE INDEX IF NOT EXISTS idx_units_property ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_ownerships_unit ON ownerships(unit_id);
CREATE INDEX IF NOT EXISTS idx_ownerships_client ON ownerships(client_id);
CREATE INDEX IF NOT EXISTS idx_requests_unit ON requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_requests_client ON requests(client_id);
CREATE INDEX IF NOT EXISTS idx_request_rework_comments_request ON request_rework_comments(request_id, comment_number);
CREATE INDEX IF NOT EXISTS idx_request_status_logs_request ON request_status_logs(request_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_charges_unit ON charges(unit_id);
CREATE INDEX IF NOT EXISTS idx_documents_property ON documents(property_id);

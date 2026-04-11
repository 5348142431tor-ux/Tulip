ALTER TABLE units
  ADD COLUMN IF NOT EXISTS layout_type TEXT,
  ADD COLUMN IF NOT EXISTS layout_feature TEXT,
  ADD COLUMN IF NOT EXISTS water_account_number TEXT,
  ADD COLUMN IF NOT EXISTS electricity_account_number TEXT;

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS aidat_calculation_mode TEXT NOT NULL DEFAULT 'equal_for_all',
  ADD COLUMN IF NOT EXISTS aidat_start_date DATE,
  ADD COLUMN IF NOT EXISTS aidat_fixed_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS aidat_currency_code TEXT NOT NULL DEFAULT 'TRY';

WITH company AS (
  SELECT id
  FROM management_companies
  WHERE code = 'MC-001'
),
manager AS (
  SELECT id
  FROM staff
  WHERE code = 'ST-01'
)
INSERT INTO properties (
  management_company_id,
  code,
  title,
  city,
  district,
  property_type,
  status,
  unit_count,
  manager_staff_id
)
SELECT
  company.id,
  'OBJ-004',
  'Tulip Towers',
  'Antalya',
  'Not set',
  'residential_building',
  'active',
  1,
  manager.id
FROM company, manager
ON CONFLICT (code) DO UPDATE
SET
  title = EXCLUDED.title,
  city = EXCLUDED.city,
  district = EXCLUDED.district,
  manager_staff_id = EXCLUDED.manager_staff_id,
  updated_at = NOW();

INSERT INTO units (
  property_id,
  code,
  unit_number,
  floor_label,
  area_sqm,
  resident_count,
  status
)
SELECT
  p.id,
  'OBJ-004-U47',
  '47',
  '-',
  0,
  0,
  'occupied'
FROM properties p
WHERE p.code = 'OBJ-004'
ON CONFLICT (code) DO UPDATE
SET
  property_id = EXCLUDED.property_id,
  unit_number = EXCLUDED.unit_number,
  updated_at = NOW();

INSERT INTO clients (
  management_company_id,
  code,
  full_name,
  client_type,
  phone,
  telegram_id,
  status
)
SELECT
  mc.id,
  'CL-300',
  'Dmitrii Tormosov',
  'owner',
  NULL,
  '7367415157',
  'active'
FROM management_companies mc
WHERE mc.code = 'MC-001'
ON CONFLICT (code) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  telegram_id = EXCLUDED.telegram_id,
  status = EXCLUDED.status,
  updated_at = NOW();

DELETE FROM ownerships
WHERE unit_id = (SELECT id FROM units WHERE code = 'OBJ-004-U47');

INSERT INTO ownerships (
  unit_id,
  client_id,
  ownership_share,
  is_primary
)
SELECT
  u.id,
  c.id,
  100.00,
  TRUE
FROM units u
JOIN clients c ON c.code = 'CL-300'
WHERE u.code = 'OBJ-004-U47'
ON CONFLICT (unit_id, client_id) DO UPDATE
SET
  ownership_share = EXCLUDED.ownership_share,
  is_primary = EXCLUDED.is_primary,
  updated_at = NOW();

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

INSERT INTO staff (
  management_company_id,
  code,
  full_name,
  role,
  phone,
  status,
  password_hash
)
SELECT
  mc.id,
  'ST-00',
  'Tulip Antalya Admin',
  'company_admin',
  '+90 555 100 00 00',
  'active',
  '4a5242f65ec330034de6e9f4c6747983:b775026a56636df061ad060d2524844e916df91226e27e75c3173e284b91e80ce6428e85c3c497ff06d2a839665e947e1e738d8545dea588c955f9d9ff441b74'
FROM management_companies mc
WHERE mc.code = 'MC-001'
ON CONFLICT (code) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status,
  password_hash = COALESCE(staff.password_hash, EXCLUDED.password_hash),
  updated_at = NOW();

UPDATE staff
SET password_hash = CASE code
  WHEN 'ST-01' THEN 'acd197beebbdae274c8f29ffff9b5608:db4a1f56fae294a9652c7e38cabc4c3fb66e0fbb64c181d0304181d7a370e1ca9c213441db405379285bdc41e93eb7f7b9cdb71083c63462c56070aa3b9b6fe5'
  ELSE password_hash
END,
updated_at = NOW()
WHERE code IN ('ST-00', 'ST-01');

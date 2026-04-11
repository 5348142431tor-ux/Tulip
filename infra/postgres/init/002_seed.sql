DO $$
DECLARE
  company_id UUID;
  staff_kemal UUID;
  staff_irina UUID;
  staff_murat UUID;
  client_elena UUID;
  client_ahmet UUID;
  client_svetlana UUID;
  client_leyla UUID;
  client_olga UUID;
  client_pavel UUID;
  property_obj_001 UUID;
  property_obj_002 UUID;
  property_obj_003 UUID;
  unit_obj_001_1 UUID;
  unit_obj_001_2 UUID;
  unit_obj_002_a UUID;
  unit_obj_003_101 UUID;
BEGIN
  INSERT INTO management_companies (code, name)
  VALUES ('MC-001', 'Tulip Management Turkey')
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO company_id;

  INSERT INTO staff (management_company_id, code, full_name, role, phone, status)
  VALUES
    (company_id, 'ST-01', 'Kemal Yilmaz', 'manager', '+90 555 100 00 01', 'active'),
    (company_id, 'ST-02', 'Irina Volkova', 'support', '+90 555 100 00 02', 'active'),
    (company_id, 'ST-03', 'Murat Demir', 'accountant', '+90 555 100 00 03', 'active')
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO staff_kemal FROM staff WHERE code = 'ST-01';
  SELECT id INTO staff_irina FROM staff WHERE code = 'ST-02';
  SELECT id INTO staff_murat FROM staff WHERE code = 'ST-03';

  INSERT INTO clients (management_company_id, code, full_name, client_type, phone, telegram_username, status)
  VALUES
    (company_id, 'CL-088', 'Elena Petrova', 'owner', '+90 555 301 12 12', '@elenap', 'active'),
    (company_id, 'CL-031', 'Ahmet Kaya', 'owner', '+90 555 411 09 18', '@ahmetk', 'active'),
    (company_id, 'CL-102', 'Svetlana Mironova', 'owner', '+90 555 901 44 02', '@svetlanam', 'inactive'),
    (company_id, 'CL-201', 'Leyla Kaya', 'owner', '+90 555 411 09 19', NULL, 'active'),
    (company_id, 'CL-204', 'Olga Sidorova', 'owner', '+90 555 710 40 30', NULL, 'active'),
    (company_id, 'CL-205', 'Pavel Sidorov', 'owner', '+90 555 710 40 31', NULL, 'active')
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO client_elena FROM clients WHERE code = 'CL-088';
  SELECT id INTO client_ahmet FROM clients WHERE code = 'CL-031';
  SELECT id INTO client_svetlana FROM clients WHERE code = 'CL-102';
  SELECT id INTO client_leyla FROM clients WHERE code = 'CL-201';
  SELECT id INTO client_olga FROM clients WHERE code = 'CL-204';
  SELECT id INTO client_pavel FROM clients WHERE code = 'CL-205';

  INSERT INTO properties (management_company_id, code, title, city, district, property_type, status, unit_count, manager_staff_id)
  VALUES
    (company_id, 'OBJ-001', 'Sunset Residence A-12', 'Antalya', 'Konyaalti', 'residential_building', 'active', 4, staff_kemal),
    (company_id, 'OBJ-002', 'Olive Garden Villa 4', 'Bodrum', 'Yalikavak', 'villa_complex', 'active', 3, staff_irina),
    (company_id, 'OBJ-003', 'Blue Coast B-8', 'Antalya', 'Lara', 'residential_building', 'maintenance_watch', 2, staff_kemal)
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO property_obj_001 FROM properties WHERE code = 'OBJ-001';
  SELECT id INTO property_obj_002 FROM properties WHERE code = 'OBJ-002';
  SELECT id INTO property_obj_003 FROM properties WHERE code = 'OBJ-003';

  INSERT INTO units (property_id, code, unit_number, floor_label, area_sqm, resident_count, status)
  VALUES
    (property_obj_001, 'OBJ-001-U1', '1', '1', 120, 3, 'occupied'),
    (property_obj_001, 'OBJ-001-U2', '2', '1', 110, 2, 'occupied'),
    (property_obj_002, 'OBJ-002-UA', 'A', 'Ground', 210, 5, 'occupied'),
    (property_obj_003, 'OBJ-003-U101', '101', '1', 98, 2, 'occupied')
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO unit_obj_001_1 FROM units WHERE code = 'OBJ-001-U1';
  SELECT id INTO unit_obj_001_2 FROM units WHERE code = 'OBJ-001-U2';
  SELECT id INTO unit_obj_002_a FROM units WHERE code = 'OBJ-002-UA';
  SELECT id INTO unit_obj_003_101 FROM units WHERE code = 'OBJ-003-U101';

  INSERT INTO ownerships (unit_id, client_id, ownership_share, is_primary)
  VALUES
    (unit_obj_001_1, client_elena, 100.00, TRUE),
    (unit_obj_001_2, client_ahmet, 50.00, TRUE),
    (unit_obj_001_2, client_leyla, 50.00, FALSE),
    (unit_obj_002_a, client_olga, 70.00, TRUE),
    (unit_obj_002_a, client_pavel, 30.00, FALSE),
    (unit_obj_003_101, client_svetlana, 100.00, TRUE)
  ON CONFLICT (unit_id, client_id) DO NOTHING;

  INSERT INTO unit_balances (unit_id, currency_code, outstanding_amount, prepaid_amount)
  VALUES
    (unit_obj_001_1, 'TRY', 0, 0),
    (unit_obj_001_2, 'TRY', 14500, 0),
    (unit_obj_002_a, 'TRY', 10200, 0),
    (unit_obj_003_101, 'TRY', 5100, 0)
  ON CONFLICT (unit_id, currency_code) DO NOTHING;

  INSERT INTO charges (unit_id, charge_period, charge_type, amount_due, amount_paid, currency_code, due_date, status, note)
  VALUES
    (unit_obj_001_2, DATE '2026-04-01', 'maintenance', 14500, 0, 'TRY', DATE '2026-04-15', 'overdue', 'Seed debt'),
    (unit_obj_002_a, DATE '2026-04-01', 'maintenance', 10200, 0, 'TRY', DATE '2026-04-15', 'partial', 'Seed debt'),
    (unit_obj_003_101, DATE '2026-04-01', 'maintenance', 5100, 0, 'TRY', DATE '2026-04-05', 'overdue', 'Seed debt')
  ON CONFLICT DO NOTHING;

  INSERT INTO requests (management_company_id, code, unit_id, client_id, source, category, title, priority, status, assigned_staff_id)
  VALUES
    (company_id, 'REQ-1042', unit_obj_002_a, client_olga, 'telegram', 'repair', 'Протечка в ванной', 'urgent', 'in_progress', staff_kemal),
    (company_id, 'REQ-1043', unit_obj_003_101, client_ahmet, 'web', 'document', 'Продление договора аренды', 'medium', 'waiting', staff_irina)
  ON CONFLICT (code) DO NOTHING;
END $$;

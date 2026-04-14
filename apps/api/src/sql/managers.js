export const LIST_MANAGERS_SQL = `
  SELECT
    s.id,
    s.code,
    s.login,
    s.full_name,
    s.role,
    s.phone,
    s.email,
    s.status,
    s.must_change_password,
    s.can_record_client_payments,
    s.management_company_id,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    COUNT(r.id) FILTER (WHERE r.status <> 'done')::int AS open_requests
  FROM staff s
  INNER JOIN management_companies mc ON mc.id = s.management_company_id
  LEFT JOIN requests r ON r.assigned_staff_id = s.id
  WHERE s.role = 'manager'
    AND ($1::uuid IS NULL OR s.management_company_id = $1)
  GROUP BY s.id, mc.code, mc.name
  ORDER BY s.created_at DESC, s.code ASC;
`;

export const NEXT_MANAGER_CODE_SQL = `
  SELECT code
  FROM staff
  WHERE code LIKE 'ST-%'
  ORDER BY LENGTH(code) DESC, code DESC
  LIMIT 1;
`;

export const INSERT_MANAGER_SQL = `
  INSERT INTO staff (
    management_company_id,
    code,
    login,
    full_name,
    role,
    phone,
    email,
    status,
    password_hash,
    must_change_password,
    can_record_client_payments
  )
  VALUES ($1, $2, $3, $4, 'manager', $5, $6, $7, $8, $9, $10)
  RETURNING
    id,
    code,
    login,
    full_name,
    role,
    phone,
    email,
    status,
    must_change_password,
    can_record_client_payments,
    management_company_id;
`;

export const UPDATE_MANAGER_SQL = `
  UPDATE staff
  SET
    login = $3,
    full_name = $4,
    phone = $5,
    email = $6,
    status = $7,
    password_hash = COALESCE($8, password_hash),
    can_record_client_payments = $9,
    updated_at = NOW()
  WHERE code = $1
    AND role = 'manager'
    AND management_company_id = $2
  RETURNING
    id,
    code,
    login,
    full_name,
    role,
    phone,
    email,
    status,
    must_change_password,
    can_record_client_payments,
    management_company_id;
`;

export const DELETE_MANAGER_SQL = `
  DELETE FROM staff
  WHERE code = $1
    AND role = 'manager'
    AND management_company_id = $2
  RETURNING code;
`;

export const FIND_MANAGER_BY_CODE_SQL = `
  SELECT
    s.id,
    s.code,
    s.login,
    s.full_name,
    s.role,
    s.phone,
    s.email,
    s.status,
    s.must_change_password,
    s.can_record_client_payments,
    s.management_company_id,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    COUNT(r.id) FILTER (WHERE r.status <> 'done')::int AS open_requests
  FROM staff s
  INNER JOIN management_companies mc ON mc.id = s.management_company_id
  LEFT JOIN requests r ON r.assigned_staff_id = s.id
  WHERE s.code = $1
    AND s.role = 'manager'
  GROUP BY s.id, mc.code, mc.name
  LIMIT 1;
`;

export const UPDATE_COMPANY_ADMIN_PROFILE_SQL = `
  UPDATE staff
  SET
    full_name = $3,
    updated_at = NOW()
  WHERE code = $1
    AND role = 'company_admin'
    AND management_company_id = $2
  RETURNING
    id,
    code,
    login,
    full_name,
    role,
    phone,
    email,
    status,
    must_change_password,
    can_record_client_payments,
    management_company_id;
`;
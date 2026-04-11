export const FIND_CLIENTS_BY_TELEGRAM_SQL = `
  SELECT
    c.id AS client_id,
    c.code AS client_code,
    c.full_name AS client_name,
    c.phone AS client_phone,
    c.telegram_id,
    c.telegram_username,
    u.id AS unit_id,
    u.code AS unit_code,
    u.unit_number,
    p.id AS property_id,
    p.code AS property_code,
    p.title AS property_title,
    p.city,
    p.district,
    cal.id AS access_link_id,
    cal.access_code,
    cal.status AS access_link_status
  FROM clients c
  INNER JOIN ownerships o ON o.client_id = c.id
  INNER JOIN units u ON u.id = o.unit_id
  INNER JOIN properties p ON p.id = u.property_id
  LEFT JOIN client_access_links cal
    ON cal.client_id = c.id
   AND cal.unit_id = u.id
   AND cal.status = 'active'
  WHERE c.telegram_id = $1
    AND c.status = 'active'
    AND p.status <> 'archived'
  ORDER BY c.full_name, p.code, u.unit_number;
`;

export const FIND_STAFF_BY_TELEGRAM_SQL = `
  SELECT
    s.id AS staff_id,
    s.code AS staff_code,
    s.full_name AS staff_name,
    s.role AS staff_role,
    s.phone AS staff_phone,
    s.telegram_id,
    mc.id AS management_company_id,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    mc.status AS management_company_status
  FROM staff s
  INNER JOIN management_companies mc ON mc.id = s.management_company_id
  WHERE s.telegram_id = $1
    AND s.status = 'active'
    AND mc.status = 'active'
  ORDER BY s.full_name
  LIMIT 1;
`;

export const FIND_COMPANY_BY_TELEGRAM_SQL = `
  SELECT
    id AS management_company_id,
    code AS management_company_code,
    name AS management_company_name,
    status AS management_company_status,
    telegram_id,
    telegram_username,
    temp_password,
    must_change_password
  FROM management_companies
  WHERE telegram_id = $1
    AND status = 'active'
  LIMIT 1;
`;

export const UPDATE_CLIENT_TELEGRAM_USERNAME_SQL = `
  UPDATE clients
  SET telegram_username = COALESCE($2, telegram_username),
      updated_at = NOW()
  WHERE id = $1;
`;

export const INSERT_CLIENT_ACCESS_LINK_SQL = `
  INSERT INTO client_access_links (
    management_company_id,
    client_id,
    unit_id,
    access_code,
    status
  )
  VALUES ($1, $2, $3, $4, 'active')
  RETURNING id, access_code, status;
`;

export const FIND_ACCESS_LINK_BY_CODE_SQL = `
  SELECT
    cal.id AS access_link_id,
    cal.access_code,
    cal.status AS access_link_status,
    cal.expires_at,
    cal.last_used_at,
    c.id AS client_id,
    c.code AS client_code,
    c.full_name AS client_name,
    c.phone AS client_phone,
    c.telegram_id,
    c.telegram_username,
    u.id AS unit_id,
    u.code AS unit_code,
    u.unit_number,
    u.floor_label,
    u.area_sqm,
    u.layout_type,
    u.layout_feature,
    u.water_account_number,
    u.electricity_account_number,
    u.resident_count,
    u.status AS unit_status,
    p.id AS property_id,
    p.code AS property_code,
    p.title AS property_title,
    p.city,
    p.district,
    p.status AS property_status
  FROM client_access_links cal
  INNER JOIN clients c ON c.id = cal.client_id
  INNER JOIN units u ON u.id = cal.unit_id
  INNER JOIN properties p ON p.id = u.property_id
  WHERE cal.access_code = $1
  LIMIT 1;
`;

export const TOUCH_ACCESS_LINK_SQL = `
  UPDATE client_access_links
  SET last_used_at = NOW(),
      updated_at = NOW()
  WHERE id = $1;
`;

export const LIST_UNIT_BALANCES_BY_UNIT_CODE_SQL = `
  SELECT currency_code, outstanding_amount
  FROM unit_balances ub
  INNER JOIN units u ON u.id = ub.unit_id
  WHERE u.code = $1
  ORDER BY currency_code;
`;

export const LIST_UNIT_CHARGES_BY_UNIT_CODE_SQL = `
  SELECT
    id,
    charge_period,
    charge_type,
    amount_due,
    amount_paid,
    currency_code,
    status,
    note
  FROM charges c
  INNER JOIN units u ON u.id = c.unit_id
  WHERE u.code = $1
  ORDER BY charge_period DESC, created_at DESC;
`;

export const LIST_UNIT_DOCUMENTS_FOR_CLIENT_SQL = `
  SELECT
    d.id,
    d.code,
    d.title,
    d.document_type,
    d.storage_url,
    d.visibility_scope,
    d.created_at
  FROM documents d
  INNER JOIN units u ON u.id = d.unit_id
  WHERE u.code = $1
    AND (d.client_id = $2 OR d.client_id IS NULL)
    AND d.visibility_scope IN ('client', 'internal + client')
  ORDER BY d.created_at DESC;
`;

export const LIST_CLIENT_REQUESTS_BY_UNIT_SQL = `
  SELECT
    r.id,
    r.code,
    r.category,
    r.title,
    r.description,
    r.priority,
    r.status,
    r.source,
    r.created_at,
    s.full_name AS assignee_name
  FROM requests r
  LEFT JOIN staff s ON s.id = r.assigned_staff_id
  INNER JOIN units u ON u.id = r.unit_id
  WHERE u.code = $1
    AND r.client_id = $2
  ORDER BY r.created_at DESC;
`;

export const FIND_STAFF_AUTH_BY_LOGIN_SQL = `
  SELECT
    s.id,
    s.code,
    s.login,
    s.full_name,
    s.role,
    s.password_hash,
    s.must_change_password,
    s.can_record_client_payments,
    s.status,
    s.email,
    mc.id AS management_company_id,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    mc.status AS management_company_status
  FROM staff s
  INNER JOIN management_companies mc ON mc.id = s.management_company_id
  WHERE UPPER(COALESCE(s.login, s.code)) = UPPER($1)
     OR UPPER(s.code) = UPPER($1)
     OR LOWER(COALESCE(s.email, '')) = LOWER($1)
  LIMIT 1;
`;

export const FIND_STAFF_BY_CODE_SQL = `
  SELECT
    s.id,
    s.code,
    s.login,
    s.full_name,
    s.role,
    s.must_change_password,
    s.can_record_client_payments,
    s.status,
    mc.id AS management_company_id,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    mc.status AS management_company_status
  FROM staff s
  INNER JOIN management_companies mc ON mc.id = s.management_company_id
  WHERE s.code = $1
  LIMIT 1;
`;

export const FIND_CLIENT_BY_CODE_SQL = `
  SELECT
    c.id,
    c.code,
    c.full_name,
    c.status,
    c.management_company_id,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    mc.status AS management_company_status
  FROM clients c
  INNER JOIN management_companies mc ON mc.id = c.management_company_id
  WHERE c.code = $1
    AND EXISTS (
      SELECT 1
      FROM ownerships o
      INNER JOIN units u ON u.id = o.unit_id
      WHERE o.client_id = c.id
    )
  LIMIT 1;
`;

export const LIST_STAFF_IMPERSONATION_TARGETS_SQL = `
  SELECT
    s.id,
    s.code,
    s.login,
    s.full_name,
    s.role,
    s.must_change_password,
    s.can_record_client_payments,
    s.status,
    mc.id AS management_company_id,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    mc.status AS management_company_status
  FROM staff s
  INNER JOIN management_companies mc ON mc.id = s.management_company_id
  ORDER BY s.full_name ASC, s.code ASC;
`;

export const LIST_CLIENT_IMPERSONATION_TARGETS_SQL = `
  SELECT
    c.id,
    c.code,
    c.full_name,
    c.status,
    c.management_company_id,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    mc.status AS management_company_status
  FROM clients c
  INNER JOIN management_companies mc ON mc.id = c.management_company_id
  WHERE EXISTS (
    SELECT 1
    FROM ownerships o
    INNER JOIN units u ON u.id = o.unit_id
    WHERE o.client_id = c.id
  )
  ORDER BY c.full_name ASC, c.code ASC;
`;


export const FIND_COMPANY_IMPERSONATION_TARGET_SQL = `
  SELECT
    mc.id,
    mc.code,
    mc.name,
    mc.director_name,
    mc.status
  FROM management_companies mc
  WHERE mc.code = $1
  LIMIT 1;
`;

export const LIST_COMPANY_IMPERSONATION_TARGETS_SQL = `
  SELECT
    mc.id,
    mc.code,
    mc.name,
    mc.director_name,
    mc.status
  FROM management_companies mc
  ORDER BY mc.created_at DESC, mc.code ASC;
`;

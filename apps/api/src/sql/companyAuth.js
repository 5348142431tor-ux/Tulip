export const FIND_COMPANY_AUTH_BY_TELEGRAM_SQL = `
  SELECT
    mc.id AS management_company_id,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    mc.status AS management_company_status,
    mc.telegram_id,
    mc.telegram_username,
    mc.temp_password,
    mc.password_hash,
    mc.must_change_password,
    cal.id AS access_link_id,
    cal.access_code,
    cal.status AS access_link_status
  FROM management_companies mc
  LEFT JOIN company_access_links cal
    ON cal.management_company_id = mc.id
   AND cal.status = 'active'
  WHERE mc.telegram_id = $1
    AND mc.status = 'active'
  LIMIT 1;
`;

export const INSERT_COMPANY_ACCESS_LINK_SQL = `
  INSERT INTO company_access_links (
    management_company_id,
    access_code,
    status
  )
  VALUES ($1, $2, 'active')
  RETURNING id, access_code, status;
`;

export const FIND_COMPANY_ACCESS_BY_CODE_SQL = `
  SELECT
    cal.id AS access_link_id,
    cal.access_code,
    cal.status AS access_link_status,
    cal.expires_at,
    cal.last_used_at,
    mc.id AS management_company_id,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    mc.status AS management_company_status,
    mc.telegram_id,
    mc.telegram_username,
    mc.temp_password,
    mc.password_hash,
    mc.must_change_password,
    mc.created_at,
    mc.updated_at
  FROM company_access_links cal
  INNER JOIN management_companies mc ON mc.id = cal.management_company_id
  WHERE cal.access_code = $1
  LIMIT 1;
`;

export const TOUCH_COMPANY_ACCESS_LINK_SQL = `
  UPDATE company_access_links
  SET last_used_at = NOW(),
      updated_at = NOW()
  WHERE id = $1;
`;

export const UPDATE_COMPANY_TELEGRAM_USERNAME_SQL = `
  UPDATE management_companies
  SET telegram_username = COALESCE($2, telegram_username),
      updated_at = NOW()
  WHERE id = $1;
`;

export const UPDATE_COMPANY_PASSWORD_SQL = `
  UPDATE management_companies
  SET
    password_hash = $2,
    temp_password = NULL,
    must_change_password = FALSE,
    password_changed_at = NOW(),
    updated_at = NOW()
  WHERE id = $1
  RETURNING
    id,
    code,
    name,
    status,
    telegram_id,
    telegram_username,
    must_change_password,
    created_at,
    updated_at;
`;

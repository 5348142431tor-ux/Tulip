export const LIST_COMPANIES_SQL = `
  SELECT
    id,
    code,
    name,
    director_name,
    status,
    telegram_id,
    telegram_username,
    temp_password,
    must_change_password,
    created_at
  FROM management_companies
  ORDER BY created_at DESC, code ASC;
`;

export const FIND_COMPANY_BY_CODE_SQL = `
  SELECT id
  FROM management_companies
  WHERE code = $1
  LIMIT 1;
`;

export const INSERT_COMPANY_SQL = `
  INSERT INTO management_companies (
    code,
    name,
    director_name,
    status,
    telegram_id,
    telegram_username,
    temp_password,
    must_change_password
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING
    id,
    code,
    name,
    director_name,
    status,
    telegram_id,
    telegram_username,
    temp_password,
    must_change_password,
    created_at;
`;

export const UPDATE_COMPANY_SQL = `
  UPDATE management_companies
  SET
    name = $2,
    director_name = $3,
    status = $4,
    telegram_id = $5,
    telegram_username = $6,
    updated_at = NOW()
  WHERE code = $1
  RETURNING
    id,
    code,
    name,
    director_name,
    status,
    telegram_id,
    telegram_username,
    temp_password,
    must_change_password,
    created_at;
`;

export const DELETE_COMPANY_SQL = `
  DELETE FROM management_companies
  WHERE code = $1
  RETURNING id, code;
`;

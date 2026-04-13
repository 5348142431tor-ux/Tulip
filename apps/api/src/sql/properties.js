export const LIST_PROPERTIES_SQL = `
  SELECT
    p.id,
    p.code,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    p.title,
    p.city,
    p.district,
    p.property_type,
    p.aidat_calculation_mode,
    p.aidat_start_date,
    p.aidat_fixed_amount,
    p.aidat_currency_code,
    p.status,
    p.unit_count,
    s.code AS manager_code,
    s.full_name AS manager_name,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'currency', balance_rows.currency_code,
            'amount', balance_rows.total_amount
          )
          ORDER BY balance_rows.currency_code
        )
        FROM (
          SELECT
            ub.currency_code,
            SUM(ub.outstanding_amount) AS total_amount
          FROM units pu
          INNER JOIN unit_balances ub ON ub.unit_id = pu.id
          WHERE pu.property_id = p.id
          GROUP BY ub.currency_code
        ) AS balance_rows
      ),
      '[]'::json
    ) AS total_balances
  FROM properties p
  INNER JOIN management_companies mc ON mc.id = p.management_company_id
  LEFT JOIN staff s ON s.id = p.manager_staff_id
  WHERE ($1::boolean = TRUE OR p.status <> 'archived')
  GROUP BY p.id, mc.code, mc.name, s.code, s.full_name
  ORDER BY p.code;
`;

export const PROPERTY_DETAIL_SQL = `
  SELECT
    p.id AS property_id,
    p.code AS property_code,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    p.title AS property_title,
    p.city,
    p.district,
    p.property_type,
    p.aidat_calculation_mode,
    p.aidat_start_date,
    p.aidat_fixed_amount,
    p.aidat_currency_code,
    p.status AS property_status,
    p.unit_count,
    s.code AS manager_code,
    s.full_name AS manager_name,
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
    o.id AS ownership_id,
    o.ownership_share,
    o.is_primary,
    c.id AS client_id,
    c.code AS client_code,
    c.full_name AS client_name,
    c.phone AS client_phone,
    c.telegram_id AS client_telegram_id
  FROM properties p
  INNER JOIN management_companies mc ON mc.id = p.management_company_id
  LEFT JOIN staff s ON s.id = p.manager_staff_id
  LEFT JOIN units u ON u.property_id = p.id
  LEFT JOIN ownerships o ON o.unit_id = u.id
  LEFT JOIN clients c ON c.id = o.client_id
  WHERE p.code = $1
  ORDER BY
    CASE WHEN u.unit_number ~ '^[0-9]+$' THEN u.unit_number::integer END NULLS LAST,
    u.unit_number,
    o.is_primary DESC,
    c.full_name;
`;

export const LIST_PROPERTY_UNIT_BALANCES_SQL = `
  SELECT
    u.id AS unit_id,
    u.code AS unit_code,
    ub.currency_code,
    ub.outstanding_amount
  FROM units u
  INNER JOIN properties p ON p.id = u.property_id
  INNER JOIN unit_balances ub ON ub.unit_id = u.id
  WHERE p.code = $1
  ORDER BY
    CASE WHEN u.unit_number ~ '^[0-9]+$' THEN u.unit_number::integer END NULLS LAST,
    u.unit_number,
    ub.currency_code;
`;

export const STAFF_LOOKUP_SQL = `
  SELECT s.id, s.code, s.full_name, mc.code AS management_company_code
  FROM staff s
  INNER JOIN management_companies mc ON mc.id = s.management_company_id
  WHERE s.full_name = $1 OR s.code = $1
  LIMIT 1;
`;

export const INSERT_PROPERTY_SQL = `
  INSERT INTO properties (
    management_company_id,
    code,
    title,
    city,
    district,
    property_type,
    aidat_calculation_mode,
    aidat_start_date,
    aidat_fixed_amount,
    aidat_currency_code,
    status,
    unit_count,
    manager_staff_id
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  RETURNING id, code;
`;

export const INSERT_UNIT_SQL = `
  INSERT INTO units (
    property_id,
    code,
    unit_number,
    floor_label,
    area_sqm,
    layout_type,
    layout_feature,
    water_account_number,
    electricity_account_number,
    resident_count,
    status
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
`;

export const ARCHIVE_PROPERTY_SQL = `
  UPDATE properties
  SET status = 'archived', updated_at = NOW()
  WHERE code = $1
  RETURNING id, code;
`;

export const RESTORE_PROPERTY_SQL = `
  UPDATE properties
  SET status = 'active', updated_at = NOW()
  WHERE code = $1
  RETURNING id, code;
`;

export const UPDATE_PROPERTY_FINANCE_SQL = `
  UPDATE properties
  SET
    aidat_calculation_mode = $2,
    aidat_start_date = $3,
    aidat_fixed_amount = $4,
    aidat_currency_code = $5,
    updated_at = NOW()
  WHERE code = $1
  RETURNING id, code;
`;

export const INSERT_ACTIVITY_LOG_SQL = `
  INSERT INTO activity_logs (
    management_company_id,
    actor_type,
    actor_id,
    entity_type,
    entity_id,
    action,
    payload
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
  RETURNING id, created_at, payload;
`;

export const LIST_PROPERTY_ACTIVITY_LOGS_SQL = `
  SELECT
    id,
    action,
    payload,
    created_at
  FROM activity_logs
  WHERE entity_type = 'property' AND entity_id = $1
  ORDER BY created_at DESC;
`;

export const LIST_PROPERTY_CHARGES_SQL = `
  SELECT
    u.code AS unit_code,
    c.id AS charge_id,
    c.charge_period,
    c.charge_type,
    c.amount_due,
    c.amount_paid,
    c.currency_code,
    c.status,
    c.note
  FROM charges c
  INNER JOIN units u ON u.id = c.unit_id
  INNER JOIN properties p ON p.id = u.property_id
  WHERE p.code = $1
  ORDER BY
    c.charge_period DESC,
    CASE WHEN u.unit_number ~ '^[0-9]+$' THEN u.unit_number::integer END NULLS LAST,
    u.unit_number;
`;

export const LOOKUP_PROPERTY_UNITS_SQL = `
  SELECT
    u.id,
    u.code,
    u.unit_number,
    u.area_sqm
  FROM units u
  INNER JOIN properties p ON p.id = u.property_id
  WHERE p.code = $1
  ORDER BY
    CASE WHEN u.unit_number ~ '^[0-9]+$' THEN u.unit_number::integer END NULLS LAST,
    u.unit_number;
`;

export const FIND_EXISTING_AIDAT_CHARGE_SQL = `
  SELECT id
  FROM charges
  WHERE unit_id = $1
    AND charge_type = 'aidat'
    AND charge_period = $2
  LIMIT 1;
`;

export const LIST_UNIT_OPEN_AIDAT_CHARGES_SQL = `
  SELECT
    c.id,
    c.charge_period,
    c.amount_due,
    c.amount_paid,
    c.currency_code
  FROM charges c
  INNER JOIN units u ON u.id = c.unit_id
  WHERE u.code = $1
    AND c.charge_type = 'aidat'
    AND c.currency_code = $2
    AND c.amount_due > c.amount_paid
  ORDER BY c.charge_period ASC, c.created_at ASC;
`;

export const UPDATE_CHARGE_PAYMENT_SQL = `
  UPDATE charges
  SET
    amount_paid = $2,
    status = $3,
    updated_at = NOW()
  WHERE id = $1;
`;

export const DECREASE_UNIT_BALANCE_SQL = `
  UPDATE unit_balances
  SET
    outstanding_amount = GREATEST(0, outstanding_amount - $3),
    last_calculated_at = NOW(),
    updated_at = NOW()
  WHERE unit_id = $1 AND currency_code = $2;
`;

export const INSERT_CHARGE_SQL = `
  INSERT INTO charges (
    unit_id,
    charge_period,
    charge_type,
    amount_due,
    amount_paid,
    currency_code,
    due_date,
    status,
    note
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING id;
`;

export const UPSERT_UNIT_BALANCE_SQL = `
  INSERT INTO unit_balances (
    unit_id,
    currency_code,
    outstanding_amount,
    prepaid_amount,
    last_calculated_at
  )
  VALUES ($1, $2, $3, 0, NOW())
  ON CONFLICT (unit_id, currency_code)
  DO UPDATE SET
    outstanding_amount = unit_balances.outstanding_amount + EXCLUDED.outstanding_amount,
    last_calculated_at = NOW(),
    updated_at = NOW();
`;

export const LOOKUP_UNIT_SQL = `
  SELECT
    u.id,
    u.code,
    u.unit_number,
    u.floor_label,
    u.area_sqm,
    u.layout_type,
    u.layout_feature,
    u.water_account_number,
    u.electricity_account_number,
    p.id AS property_id,
    p.code AS property_code
  FROM units u
  INNER JOIN properties p ON p.id = u.property_id
  WHERE u.code = $1
  LIMIT 1;
`;

export const UPDATE_UNIT_PROFILE_SQL = `
  UPDATE units
  SET
    floor_label = $2,
    area_sqm = $3,
    layout_type = $4,
    layout_feature = $5,
    water_account_number = $6,
    electricity_account_number = $7,
    updated_at = NOW()
  WHERE code = $1
  RETURNING id, code;
`;

export const DELETE_UNIT_OWNERSHIPS_SQL = `
  DELETE FROM ownerships
  WHERE unit_id = $1;
`;

export const FIND_CLIENT_BY_CODE_SQL = `
  SELECT id
  FROM clients
  WHERE code = $1
  LIMIT 1;
`;

export const FIND_CLIENT_BY_PHONE_SQL = `
  SELECT id
  FROM clients
  WHERE management_company_id = $1
    AND phone = $2
  LIMIT 1;
`;

export const INSERT_CLIENT_SQL = `
  INSERT INTO clients (
    management_company_id,
    code,
    full_name,
    client_type,
    phone,
    telegram_id,
    status
  )
  VALUES ($1, $2, $3, 'owner', $4, $5, 'active')
  RETURNING id;
`;

export const INSERT_OWNERSHIP_SQL = `
  INSERT INTO ownerships (
    unit_id,
    client_id,
    ownership_share,
    is_primary
  )
  VALUES ($1, $2, $3, $4);
`;

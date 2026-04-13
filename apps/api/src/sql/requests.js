export const LIST_REQUESTS_SQL = `
  SELECT
    r.id,
    r.request_number,
    r.code,
    r.category,
    r.title,
    r.description,
    r.priority,
    r.status,
    r.source,
    r.attachment_url,
    r.cancel_comment,
    r.client_decision_pending,
    r.created_at,
    r.updated_at,
    r.closed_at,
    mc.id AS management_company_id,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    p.code AS property_code,
    p.title AS property_title,
    p.manager_staff_id,
    u.code AS unit_code,
    u.unit_number,
    c.code AS client_code,
    c.full_name AS client_name,
    s.id AS assignee_staff_id,
    s.code AS assignee_staff_code,
    s.full_name AS assignee_name,
    latest_rework.comment_number AS latest_rework_comment_number,
    latest_rework.comment_text AS latest_rework_comment_text,
    latest_rework.created_at AS latest_rework_comment_created_at,
    rework_history.rework_comments,
    status_history.status_logs
  FROM requests r
  INNER JOIN management_companies mc ON mc.id = r.management_company_id
  LEFT JOIN units u ON u.id = r.unit_id
  LEFT JOIN properties p ON p.id = u.property_id
  LEFT JOIN clients c ON c.id = r.client_id
  LEFT JOIN staff s ON s.id = r.assigned_staff_id
  LEFT JOIN LATERAL (
    SELECT
      rc.comment_number,
      rc.comment_text,
      rc.created_at
    FROM request_rework_comments rc
    WHERE rc.request_id = r.id
    ORDER BY rc.comment_number DESC
    LIMIT 1
  ) latest_rework ON TRUE
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'number', rc.comment_number,
          'comment', rc.comment_text,
          'createdAt', rc.created_at
        )
        ORDER BY rc.comment_number ASC
      ),
      '[]'::json
    ) AS rework_comments
    FROM request_rework_comments rc
    WHERE rc.request_id = r.id
  ) rework_history ON TRUE
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'status', sl.status,
          'actorRole', sl.actor_role,
          'actorName', sl.actor_name,
          'note', sl.note,
          'changedAt', sl.changed_at
        )
        ORDER BY sl.changed_at ASC
      ),
      '[]'::json
    ) AS status_logs
    FROM request_status_logs sl
    WHERE sl.request_id = r.id
  ) status_history ON TRUE
  ORDER BY r.request_number DESC;
`;

export const LOOKUP_CLIENT_UNIT_FOR_REQUEST_SQL = `
  SELECT
    mc.id AS management_company_id,
    mc.code AS management_company_code,
    mc.name AS management_company_name,
    p.id AS property_id,
    p.code AS property_code,
    p.title AS property_title,
    p.manager_staff_id,
    u.id AS unit_id,
    u.code AS unit_code,
    u.unit_number,
    c.id AS client_id,
    c.code AS client_code,
    c.full_name AS client_name,
    s.id AS assignee_staff_id,
    s.code AS assignee_staff_code,
    s.full_name AS assignee_name
  FROM units u
  INNER JOIN properties p ON p.id = u.property_id
  INNER JOIN management_companies mc ON mc.id = p.management_company_id
  INNER JOIN ownerships o ON o.unit_id = u.id
  INNER JOIN clients c ON c.id = o.client_id
  LEFT JOIN staff s ON s.id = p.manager_staff_id
  WHERE u.code = $1
    AND c.code = $2
  LIMIT 1;
`;

export const INSERT_REQUEST_SQL = `
  INSERT INTO requests (
    management_company_id,
    code,
    unit_id,
    client_id,
    source,
    category,
    title,
    description,
    priority,
    status,
    assigned_staff_id,
    attachment_url,
    client_decision_pending
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, FALSE)
  RETURNING id, request_number, code;
`;

export const UPDATE_REQUEST_STATUS_SQL = `
  UPDATE requests
  SET
    status = $2,
    cancel_comment = $3,
    client_decision_pending = $4,
    updated_at = NOW(),
    closed_at = CASE
      WHEN $5 THEN NOW()
      WHEN $2 = 'cancelled' THEN NOW()
      ELSE NULL
    END
  WHERE code = $1
  RETURNING id, code;
`;

export const INSERT_REQUEST_REWORK_COMMENT_SQL = `
  INSERT INTO request_rework_comments (
    request_id,
    comment_number,
    client_id,
    comment_text
  )
  SELECT
    $1,
    COALESCE(MAX(rc.comment_number), 0) + 1,
    (SELECT id FROM clients WHERE code = $2 LIMIT 1),
    $3
  FROM request_rework_comments rc
  WHERE rc.request_id = $1
  RETURNING id, comment_number, comment_text, created_at;
`;

export const INSERT_REQUEST_STATUS_LOG_SQL = `
  INSERT INTO request_status_logs (
    request_id,
    status,
    actor_role,
    actor_name,
    note
  )
  VALUES ($1, $2, $3, $4, $5)
  RETURNING id;
`;

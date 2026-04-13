import crypto from "node:crypto";
import { query, withTransaction } from "../db.js";
import {
  INSERT_REQUEST_REWORK_COMMENT_SQL,
  INSERT_REQUEST_SQL,
  INSERT_REQUEST_STATUS_LOG_SQL,
  LIST_REQUESTS_SQL,
  LOOKUP_CLIENT_UNIT_FOR_REQUEST_SQL,
  UPDATE_REQUEST_STATUS_SQL,
} from "../sql/requests.js";

function buildRequestCode() {
  return `REQ-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function normalizeStatus(value = "new") {
  const normalized = String(value || "new").trim();
  return ["new", "in_progress", "done", "cancelled"].includes(normalized)
    ? normalized
    : "new";
}

function mapRequestRow(row) {
  const reworkComments = Array.isArray(row.rework_comments)
    ? row.rework_comments.map((item) => ({
        number: Number(item.number) || 0,
        comment: item.comment || "",
        createdAt: item.createdAt || "",
      }))
    : [];
  const statusHistory = Array.isArray(row.status_logs)
    ? row.status_logs.map((item) => ({
        status: normalizeStatus(item.status),
        actorRole: item.actorRole || "",
        actorName: item.actorName || "",
        note: item.note || "",
        changedAt: item.changedAt || "",
      }))
    : [];

  return {
    id: row.id,
    requestNumber: Number(row.request_number) || 0,
    code: row.code,
    clientId: row.client_code || "",
    client: row.client_name || "",
    property: row.property_title || "",
    propertyCode: row.property_code || "",
    unitCode: row.unit_code || "",
    unitNumber: row.unit_number || "",
    category: row.category || "general",
    priority: row.priority || "medium",
    status: normalizeStatus(row.status),
    clientDecisionPending: Boolean(row.client_decision_pending),
    assignee: row.assignee_name || "Не назначен",
    assigneeId: row.assignee_staff_code || "",
    companyId: row.management_company_code || "",
    companyName: row.management_company_name || "",
    source: row.source || "client",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    title: row.title || "",
    description: row.description || "",
    attachmentUrl: row.attachment_url || "",
    cancelComment: row.cancel_comment || "",
    latestReworkCommentNumber: Number(row.latest_rework_comment_number) || 0,
    latestReworkComment: row.latest_rework_comment_text || "",
    latestReworkCommentCreatedAt: row.latest_rework_comment_created_at || "",
    reworkComments,
    statusHistory,
  };
}

async function insertRequestStatusLog(executor, requestId, status, actorRole = "", actorName = "", note = "") {
  await executor.query(INSERT_REQUEST_STATUS_LOG_SQL, [requestId, status, actorRole || null, actorName || null, note || null]);
}

async function loadMappedRequests() {
  const result = await query(LIST_REQUESTS_SQL);
  return result.rows.map(mapRequestRow);
}

export async function listRequests(access) {
  const rows = await loadMappedRequests();

  if (access.role === "project_owner") {
    return rows;
  }

  if (access.role === "company_admin") {
    return rows.filter((row) => !access.company?.code || row.companyId === access.company.code);
  }

  if (access.role === "manager") {
    return rows.filter((row) => row.assignee === access.userName || row.assigneeId === access.userId);
  }

  if (access.role === "client") {
    return rows.filter((row) => row.clientId === access.clientId);
  }

  return [];
}

export async function createClientRequest({ clientCode, unitCode, description, attachmentUrl = "" }) {
  return withTransaction(async (client) => {
    const lookup = await client.query(LOOKUP_CLIENT_UNIT_FOR_REQUEST_SQL, [unitCode, clientCode]);
    const row = lookup.rows[0];

    if (!row) {
      const error = new Error("Квартира клиента не найдена");
      error.statusCode = 404;
      throw error;
    }

    const cleanDescription = String(description || "").trim();
    if (!cleanDescription) {
      const error = new Error("Текст заявки обязателен");
      error.statusCode = 400;
      throw error;
    }

    const created = await client.query(INSERT_REQUEST_SQL, [
      row.management_company_id,
      buildRequestCode(),
      row.unit_id,
      row.client_id,
      "client_cabinet",
      "general",
      cleanDescription.slice(0, 80),
      cleanDescription,
      "medium",
      "new",
      row.assignee_staff_id || null,
      String(attachmentUrl || "").trim() || null,
    ]);

    await insertRequestStatusLog(client, created.rows[0].id, "new", "client", row.client_name);

    return mapRequestRow({
      id: created.rows[0].id,
      request_number: created.rows[0].request_number,
      code: created.rows[0].code,
      client_code: row.client_code,
      client_name: row.client_name,
      property_title: row.property_title,
      property_code: row.property_code,
      unit_code: row.unit_code,
      unit_number: row.unit_number,
      category: "general",
      priority: "medium",
      status: "new",
      client_decision_pending: false,
      assignee_name: row.assignee_name,
      assignee_staff_code: row.assignee_staff_code,
      management_company_code: row.management_company_code,
      management_company_name: row.management_company_name,
      source: "client_cabinet",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      closed_at: null,
      title: cleanDescription.slice(0, 80),
      description: cleanDescription,
      attachment_url: String(attachmentUrl || "").trim() || null,
      cancel_comment: null,
      latest_rework_comment_number: null,
      latest_rework_comment_text: null,
      latest_rework_comment_created_at: null,
      rework_comments: [],
      status_logs: [
        {
          status: "new",
          actorRole: "client",
          actorName: row.client_name,
          changedAt: new Date().toISOString(),
        },
      ],
    });
  });
}

export async function updateRequestStatus({ access, requestCode, status, cancelComment = "" }) {
  const normalizedStatus = normalizeStatus(status);
  const cleanComment = String(cancelComment || "").trim();

  if (normalizedStatus === "cancelled" && !cleanComment) {
    const error = new Error("Комментарий при отмене обязателен");
    error.statusCode = 400;
    throw error;
  }

  const requests = await loadMappedRequests();
  const targetRequest = requests.find((item) => item.code === requestCode);

  if (!targetRequest) {
    const error = new Error("Заявка не найдена");
    error.statusCode = 404;
    throw error;
  }

  const canUpdate =
    access.role === "project_owner" ||
    (access.role === "company_admin" && (!access.company?.code || targetRequest.companyId === access.company.code)) ||
    (access.role === "manager" && (targetRequest.assigneeId === access.userId || targetRequest.assignee === access.userName));

  if (!canUpdate) {
    const error = new Error("Недостаточно прав для изменения этой заявки");
    error.statusCode = 403;
    throw error;
  }

  const clientDecisionPending = normalizedStatus === "done";
  const finalizeClosed = normalizedStatus === "done" && !clientDecisionPending;

  await query(UPDATE_REQUEST_STATUS_SQL, [
    requestCode,
    normalizedStatus,
    normalizedStatus === "cancelled" ? cleanComment : null,
    clientDecisionPending,
    finalizeClosed,
  ]);
  await insertRequestStatusLog({ query }, targetRequest.id, normalizedStatus, access.role, access.userName);

  const refreshed = await loadMappedRequests();
  return refreshed.find((item) => item.code === requestCode);
}

export async function reviewCompletedRequest({ access, requestCode, action, comment = "" }) {
  const normalizedAction = String(action || "").trim();
  const cleanComment = String(comment || "").trim();

  if (!access?.clientId) {
    const error = new Error("Только клиент может подтвердить или вернуть заявку");
    error.statusCode = 403;
    throw error;
  }

  if (!["accept", "rework"].includes(normalizedAction)) {
    const error = new Error("Неизвестное действие по заявке");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedAction === "rework" && !cleanComment) {
    const error = new Error("Комментарий для доработки обязателен");
    error.statusCode = 400;
    throw error;
  }

  return withTransaction(async (client) => {
    const result = await client.query(LIST_REQUESTS_SQL);
    const targetRequest = result.rows.map(mapRequestRow).find((item) => item.code === requestCode);

    if (!targetRequest) {
      const error = new Error("Заявка не найдена");
      error.statusCode = 404;
      throw error;
    }

    if (targetRequest.clientId !== access.clientId) {
      const error = new Error("Нельзя изменить чужую заявку");
      error.statusCode = 403;
      throw error;
    }

    if (targetRequest.status !== "done" || !targetRequest.clientDecisionPending) {
      const error = new Error("Эта заявка пока не ждет решения клиента");
      error.statusCode = 400;
      throw error;
    }

    if (normalizedAction === "accept") {
      await client.query(UPDATE_REQUEST_STATUS_SQL, [requestCode, "done", null, false, true]);
      await insertRequestStatusLog(client, targetRequest.id, "done", "client", targetRequest.client);
    } else {
      await client.query(INSERT_REQUEST_REWORK_COMMENT_SQL, [targetRequest.id, access.clientId, cleanComment]);
      await client.query(UPDATE_REQUEST_STATUS_SQL, [requestCode, "new", null, false, false]);
      await insertRequestStatusLog(client, targetRequest.id, "new", "client", targetRequest.client, cleanComment);
    }

    const refreshed = await client.query(LIST_REQUESTS_SQL);
    return refreshed.rows.map(mapRequestRow).find((item) => item.code === requestCode);
  });
}

import { query } from "../db.js";
import { hashPassword } from "../auth/companyPassword.js";
import {
  DELETE_MANAGER_SQL,
  FIND_MANAGER_BY_CODE_SQL,
  INSERT_MANAGER_SQL,
  LIST_MANAGERS_SQL,
  NEXT_MANAGER_CODE_SQL,
  UPDATE_COMPANY_ADMIN_PROFILE_SQL,
  UPDATE_MANAGER_SQL,
} from "../sql/managers.js";

function mapManagerRow(row) {
  return {
    id: row.code,
    managerId: row.code,
    login: row.login || row.code,
    name: row.full_name,
    role: row.role || "manager",
    phone: row.phone || "",
    email: row.email || "",
    status: row.status || "active",
    openRequests: Number(row.open_requests || 0),
    mustChangePassword: Boolean(row.must_change_password),
    canRecordClientPayments: Boolean(row.can_record_client_payments),
    companyId: row.management_company_code || "",
    companyName: row.management_company_name || "",
  };
}

async function getNextManagerCode() {
  const result = await query(NEXT_MANAGER_CODE_SQL);
  const currentCode = String(result.rows[0]?.code || "ST-00");
  const currentNumber = Number(currentCode.replace("ST-", "")) || 0;
  return `ST-${String(currentNumber + 1).padStart(2, "0")}`;
}

function normalizeLogin(login) {
  return String(login || "").trim();
}

function normalizePassword(password) {
  return String(password || "");
}

export async function listManagers(companyId = null) {
  const result = await query(LIST_MANAGERS_SQL, [companyId || null]);
  return result.rows.map(mapManagerRow);
}

export async function createManager({ companyId, login, password, name, phone, email, status, canRecordClientPayments }) {
  const nextCompanyId = String(companyId || "").trim();
  const nextLogin = normalizeLogin(login);
  const nextPassword = normalizePassword(password);

  if (!nextCompanyId) {
    const error = new Error("companyId is required");
    error.statusCode = 400;
    throw error;
  }

  if (!nextLogin) {
    const error = new Error("login is required");
    error.statusCode = 400;
    throw error;
  }

  if (!nextPassword) {
    const error = new Error("password is required");
    error.statusCode = 400;
    throw error;
  }

  const result = await query(INSERT_MANAGER_SQL, [
    nextCompanyId,
    await getNextManagerCode(),
    nextLogin,
    String(name || "").trim(),
    String(phone || "").trim() || null,
    String(email || "").trim() || null,
    String(status || "active").trim() || "active",
    hashPassword(nextPassword),
    false,
    Boolean(canRecordClientPayments),
  ]);

  return getManagerByCode(result.rows[0]?.code);
}

export async function getManagerByCode(managerCode) {
  const result = await query(FIND_MANAGER_BY_CODE_SQL, [String(managerCode || "").trim()]);
  const row = result.rows[0];
  if (!row) {
    const error = new Error("Manager not found");
    error.statusCode = 404;
    throw error;
  }
  return mapManagerRow(row);
}

export async function updateManager(managerCode, { companyId, login, password, name, phone, email, status, canRecordClientPayments }) {
  const nextLogin = normalizeLogin(login);
  if (!nextLogin) {
    const error = new Error("login is required");
    error.statusCode = 400;
    throw error;
  }

  const normalizedPassword = normalizePassword(password);
  const nextPasswordHash = normalizedPassword ? hashPassword(normalizedPassword) : null;

  const result = await query(UPDATE_MANAGER_SQL, [
    String(managerCode || "").trim(),
    String(companyId || "").trim(),
    nextLogin,
    String(name || "").trim(),
    String(phone || "").trim() || null,
    String(email || "").trim() || null,
    String(status || "active").trim() || "active",
    nextPasswordHash,
    Boolean(canRecordClientPayments),
  ]);

  if (!result.rows[0]?.code) {
    const error = new Error("Manager not found");
    error.statusCode = 404;
    throw error;
  }

  return getManagerByCode(result.rows[0].code);
}

export async function deleteManager(managerCode, companyId) {
  const result = await query(DELETE_MANAGER_SQL, [
    String(managerCode || "").trim(),
    String(companyId || "").trim(),
  ]);

  if (!result.rows[0]?.code) {
    const error = new Error("Manager not found");
    error.statusCode = 404;
    throw error;
  }

  return { managerId: result.rows[0].code };
}


export async function updateCompanyAdminProfile(adminCode, companyId, { name }) {
  const result = await query(UPDATE_COMPANY_ADMIN_PROFILE_SQL, [
    String(adminCode || "").trim(),
    String(companyId || "").trim(),
    String(name || "").trim(),
  ]);

  if (!result.rows[0]?.code) {
    const error = new Error("Company admin not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    id: result.rows[0].code,
    login: result.rows[0].login || result.rows[0].code,
    name: result.rows[0].full_name,
    role: result.rows[0].role || "company_admin",
    phone: result.rows[0].phone || "",
    email: result.rows[0].email || "",
    status: result.rows[0].status || "active",
    mustChangePassword: Boolean(result.rows[0].must_change_password),
    canRecordClientPayments: Boolean(result.rows[0].can_record_client_payments),
    companyId: String(companyId || ""),
  };
}

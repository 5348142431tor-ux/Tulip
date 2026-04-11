import crypto from "node:crypto";
import { query } from "../db.js";
import {
  DELETE_COMPANY_SQL,
  FIND_COMPANY_BY_CODE_SQL,
  INSERT_COMPANY_SQL,
  LIST_COMPANIES_SQL,
  UPDATE_COMPANY_SQL,
} from "../sql/companies.js";

function buildTemporaryPassword() {
  return `Tulip-${crypto.randomBytes(2).toString("hex").toUpperCase()}${crypto
    .randomInt(1000, 10000)
    .toString()}`;
}

function mapCompanyRow(row) {
  return {
    id: row.id,
    companyId: row.code,
    title: row.name,
    directorName: row.director_name || "",
    status: row.status || "invited",
    telegramId: row.telegram_id || "",
    telegramUsername: row.telegram_username || "",
    tempPassword: row.temp_password || "",
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: row.created_at,
    telegramLoginMode: "telegram_password",
  };
}

export async function listCompanies() {
  const result = await query(LIST_COMPANIES_SQL);
  return result.rows.map(mapCompanyRow);
}

export async function createCompany(payload) {
  const companyId = String(payload.companyId || "").trim().toUpperCase();
  const title = String(payload.title || "").trim() || `Компания ${companyId}`;

  const existing = await query(FIND_COMPANY_BY_CODE_SQL, [companyId]);
  if (existing.rows[0]?.id) {
    const error = new Error("Company with this ID already exists");
    error.statusCode = 409;
    throw error;
  }

  const result = await query(INSERT_COMPANY_SQL, [
    companyId,
    title,
    payload.directorName ? String(payload.directorName).trim() : null,
    payload.status || "invited",
    payload.telegramId ? String(payload.telegramId).trim() : null,
    payload.telegramUsername ? String(payload.telegramUsername).trim() : null,
    buildTemporaryPassword(),
    true,
  ]);

  return mapCompanyRow(result.rows[0]);
}

export async function updateCompany(companyId, payload) {
  const nextCompanyId = String(companyId || "").trim().toUpperCase();
  const title = String(payload.title || "").trim() || `Компания ${nextCompanyId}`;

  const result = await query(UPDATE_COMPANY_SQL, [
    nextCompanyId,
    title,
    payload.directorName ? String(payload.directorName).trim() : null,
    payload.status || "active",
    payload.telegramId ? String(payload.telegramId).trim() : null,
    payload.telegramUsername ? String(payload.telegramUsername).trim() : null,
  ]);

  if (!result.rows[0]) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }

  return mapCompanyRow(result.rows[0]);
}

export async function deleteCompany(companyId) {
  const nextCompanyId = String(companyId || "").trim().toUpperCase();
  const result = await query(DELETE_COMPANY_SQL, [nextCompanyId]);

  if (!result.rows[0]) {
    const error = new Error("Company not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    companyId: result.rows[0].code,
  };
}

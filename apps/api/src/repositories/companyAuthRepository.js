import crypto from "node:crypto";
import { query, withTransaction } from "../db.js";
import { buildCompanyDescriptor, buildRoleDescriptor } from "../auth/accessModel.js";
import { hashPassword, verifyPassword } from "../auth/companyPassword.js";
import {
  FIND_COMPANY_ACCESS_BY_CODE_SQL,
  FIND_COMPANY_AUTH_BY_TELEGRAM_SQL,
  INSERT_COMPANY_ACCESS_LINK_SQL,
  TOUCH_COMPANY_ACCESS_LINK_SQL,
  UPDATE_COMPANY_PASSWORD_SQL,
  UPDATE_COMPANY_TELEGRAM_USERNAME_SQL,
} from "../sql/companyAuth.js";

function buildAccessCode() {
  return crypto.randomBytes(16).toString("hex");
}

function buildCabinetPath(accessCode) {
  return `/?accessCode=${accessCode}`;
}

function mapCompany(row) {
  return buildCompanyDescriptor({
    id: row.management_company_id,
    code: row.management_company_code,
    name: row.management_company_name,
    telegramId: row.telegram_id || "",
    telegramUsername: row.telegram_username || "",
    status: row.management_company_status || "active",
  });
}

function mapCompanySession(row, accessCode) {
  const roleInfo = buildRoleDescriptor("company_admin", {
    scope: "company",
    actorType: "company",
  });

  return {
    actorType: "company",
    accessCode,
    role: roleInfo.code,
    roleLabel: roleInfo.label,
    roleInfo,
    mustChangePassword: Boolean(row.must_change_password),
    company: mapCompany(row),
  };
}

async function ensureCompanyAccessLink(client, row) {
  if (row.access_code && row.access_link_status === "active") {
    return row.access_code;
  }

  const accessCode = buildAccessCode();
  const insertResult = await client.query(INSERT_COMPANY_ACCESS_LINK_SQL, [
    row.management_company_id,
    accessCode,
  ]);

  return insertResult.rows[0]?.access_code || accessCode;
}

function assertAccessLinkActive(row) {
  if (!row) {
    const error = new Error("Company access link not found");
    error.statusCode = 404;
    throw error;
  }

  if (row.access_link_status !== "active") {
    const error = new Error("Company access link is not active");
    error.statusCode = 403;
    throw error;
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    const error = new Error("Company access link has expired");
    error.statusCode = 403;
    throw error;
  }
}

function verifyCompanyLoginPassword(row, password) {
  const nextPassword = String(password || "");

  if (row.password_hash) {
    return verifyPassword(nextPassword, row.password_hash);
  }

  return nextPassword.length > 0 && nextPassword === String(row.temp_password || "");
}

export async function resolveTelegramCompanyAccess({ telegramId, telegramUsername }) {
  return withTransaction(async (client) => {
    const result = await client.query(FIND_COMPANY_AUTH_BY_TELEGRAM_SQL, [String(telegramId)]);
    const row = result.rows[0];

    if (!row) {
      const error = new Error("Company with this Telegram account was not found");
      error.statusCode = 404;
      throw error;
    }

    if (telegramUsername) {
      await client.query(UPDATE_COMPANY_TELEGRAM_USERNAME_SQL, [
        row.management_company_id,
        telegramUsername,
      ]);
    }

    const accessCode = await ensureCompanyAccessLink(client, row);
    const roleInfo = buildRoleDescriptor("company_admin", {
      scope: "company",
      actorType: "company",
    });

    return {
      actorType: "company",
      accessCode,
      cabinetPath: buildCabinetPath(accessCode),
      company: mapCompany(row),
      role: roleInfo.code,
      roleLabel: roleInfo.label,
      roleInfo,
      mustChangePassword: Boolean(row.must_change_password),
    };
  });
}

export async function getCompanyAccessSessionByCode(accessCode) {
  const result = await query(FIND_COMPANY_ACCESS_BY_CODE_SQL, [accessCode]);
  const row = result.rows[0];

  assertAccessLinkActive(row);
  await query(TOUCH_COMPANY_ACCESS_LINK_SQL, [row.access_link_id]);

  return {
    ...mapCompanySession(row, accessCode),
    cabinetPath: buildCabinetPath(accessCode),
  };
}

export async function loginCompanyByAccessCode(accessCode, password) {
  const result = await query(FIND_COMPANY_ACCESS_BY_CODE_SQL, [accessCode]);
  const row = result.rows[0];

  assertAccessLinkActive(row);

  if (!verifyCompanyLoginPassword(row, password)) {
    const error = new Error("Invalid company password");
    error.statusCode = 401;
    throw error;
  }

  await query(TOUCH_COMPANY_ACCESS_LINK_SQL, [row.access_link_id]);

  return {
    ...mapCompanySession(row, accessCode),
    cabinetPath: buildCabinetPath(accessCode),
  };
}

export async function changeCompanyPasswordByAccessCode(
  accessCode,
  currentPassword,
  newPassword
) {
  const result = await query(FIND_COMPANY_ACCESS_BY_CODE_SQL, [accessCode]);
  const row = result.rows[0];

  assertAccessLinkActive(row);

  if (!verifyCompanyLoginPassword(row, currentPassword)) {
    const error = new Error("Current password is invalid");
    error.statusCode = 401;
    throw error;
  }

  if (String(newPassword || "").trim().length < 8) {
    const error = new Error("New password must be at least 8 characters");
    error.statusCode = 400;
    throw error;
  }

  const updateResult = await query(UPDATE_COMPANY_PASSWORD_SQL, [
    row.management_company_id,
    hashPassword(newPassword),
  ]);

  await query(TOUCH_COMPANY_ACCESS_LINK_SQL, [row.access_link_id]);

  return {
    ...mapCompanySession(
      {
        ...row,
        ...updateResult.rows[0],
        must_change_password: false,
      },
      accessCode
    ),
    cabinetPath: buildCabinetPath(accessCode),
  };
}

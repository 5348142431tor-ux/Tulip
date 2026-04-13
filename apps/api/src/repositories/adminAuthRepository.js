import { query } from "../db.js";
import { getConfig } from "../config.js";
import { verifyPassword } from "../auth/companyPassword.js";
import { buildCompanyDescriptor, buildRoleDescriptor } from "../auth/accessModel.js";
import {
  FIND_CLIENT_BY_CODE_SQL,
  FIND_COMPANY_IMPERSONATION_TARGET_SQL,
  FIND_STAFF_AUTH_BY_LOGIN_SQL,
  FIND_STAFF_BY_CODE_SQL,
  LIST_CLIENT_IMPERSONATION_TARGETS_SQL,
  LIST_COMPANY_IMPERSONATION_TARGETS_SQL,
  LIST_STAFF_IMPERSONATION_TARGETS_SQL,
} from "../sql/adminAuth.js";

function buildOwnerUser() {
  const config = getConfig();
  const roleInfo = buildRoleDescriptor("project_owner", {
    scope: "admin_cabinet",
    actorType: "platform_owner",
  });

  return {
    id: config.platformOwnerId,
    login: config.platformOwnerLogin,
    name: config.platformOwnerName,
    role: roleInfo.code,
    roleLabel: roleInfo.label,
    roleInfo,
    actorType: "platform_owner",
    mustChangePassword: false,
  };
}

function mapCompany(row) {
  return buildCompanyDescriptor({
    id: row.management_company_id,
    code: row.management_company_code,
    name: row.management_company_name,
    status: row.management_company_status || "active",
  });
}

function mapStaffUser(row) {
  const roleInfo = buildRoleDescriptor(row.role, {
    scope: "admin_cabinet",
    actorType: "company_staff",
  });

  return {
    id: row.code,
    staffId: row.id,
    login: row.login || row.code,
    name: row.full_name,
    role: roleInfo.code,
    roleLabel: roleInfo.label,
    roleInfo,
    actorType: "company_staff",
    company: mapCompany(row),
    mustChangePassword: Boolean(row.must_change_password),
    canRecordClientPayments: Boolean(row.can_record_client_payments),
  };
}

function mapClientUser(row) {
  const roleInfo = buildRoleDescriptor("client", {
    scope: "admin_cabinet",
    actorType: "client",
  });

  return {
    id: `CLIENT-${row.code}`,
    clientId: row.code,
    name: row.full_name,
    role: roleInfo.code,
    roleLabel: roleInfo.label,
    roleInfo,
    actorType: "client",
    company: mapCompany(row),
    mustChangePassword: false,
  };
}


function mapCompanyImpersonationUser(row) {
  const roleInfo = buildRoleDescriptor("company_admin", {
    scope: "admin_cabinet",
    actorType: "company",
  });

  return {
    id: `COMPANY-${row.code}`,
    companyId: row.code,
    name: row.director_name || row.name,
    role: roleInfo.code,
    roleLabel: roleInfo.label,
    roleInfo,
    actorType: "company",
    company: buildCompanyDescriptor({
      id: row.id,
      code: row.code,
      name: row.name,
      status: row.status || "active",
    }),
    mustChangePassword: false,
  };
}

function assertActive(row, entityName) {
  if (String(row?.status || "").toLowerCase() !== "active") {
    const error = new Error(`${entityName} is not active`);
    error.statusCode = 403;
    throw error;
  }
}

export async function loginAdminActor({ login, password }) {
  const normalizedLogin = String(login || "").trim();
  const normalizedPassword = String(password || "");
  const config = getConfig();

  if (!normalizedLogin || !normalizedPassword) {
    const error = new Error("Login and password are required");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedLogin.toLowerCase() === String(config.platformOwnerLogin).toLowerCase()) {
    if (!verifyPassword(normalizedPassword, config.platformOwnerPasswordHash)) {
      const error = new Error("Неверный логин или пароль");
      error.statusCode = 401;
      throw error;
    }

    return buildOwnerUser();
  }

  const result = await query(FIND_STAFF_AUTH_BY_LOGIN_SQL, [normalizedLogin]);
  const row = result.rows[0];

  if (!row || !row.password_hash || !verifyPassword(normalizedPassword, row.password_hash)) {
    const error = new Error("Неверный логин или пароль");
    error.statusCode = 401;
    throw error;
  }

  assertActive(row, "Staff account");
  return mapStaffUser(row);
}

export async function resolveImpersonationTarget(targetId) {
  const normalizedTargetId = String(targetId || "").trim();
  if (!normalizedTargetId) {
    const error = new Error("targetId is required");
    error.statusCode = 400;
    throw error;
  }

  const owner = buildOwnerUser();
  if (normalizedTargetId === owner.id) {
    return owner;
  }

  if (normalizedTargetId.startsWith("COMPANY-")) {
    const companyCode = normalizedTargetId.slice("COMPANY-".length);
    const companyResult = await query(FIND_COMPANY_IMPERSONATION_TARGET_SQL, [companyCode]);
    const companyRow = companyResult.rows[0];

    if (!companyRow) {
      const error = new Error("Company was not found");
      error.statusCode = 404;
      throw error;
    }

    assertActive(companyRow, "Company account");
    return mapCompanyImpersonationUser(companyRow);
  }

  if (normalizedTargetId.startsWith("CLIENT-")) {
    const clientCode = normalizedTargetId.slice("CLIENT-".length);
    const clientResult = await query(FIND_CLIENT_BY_CODE_SQL, [clientCode]);
    const clientRow = clientResult.rows[0];

    if (!clientRow) {
      const error = new Error("Client was not found");
      error.statusCode = 404;
      throw error;
    }

    assertActive(clientRow, "Client account");
    return mapClientUser(clientRow);
  }

  const staffResult = await query(FIND_STAFF_BY_CODE_SQL, [normalizedTargetId]);
  const staffRow = staffResult.rows[0];

  if (!staffRow) {
    const error = new Error("Staff account was not found");
    error.statusCode = 404;
    throw error;
  }

  assertActive(staffRow, "Staff account");
  return mapStaffUser(staffRow);
}

export async function listImpersonationTargets() {
  const owner = buildOwnerUser();
  const [companyResult, staffResult, clientResult] = await Promise.all([
    query(LIST_COMPANY_IMPERSONATION_TARGETS_SQL),
    query(LIST_STAFF_IMPERSONATION_TARGETS_SQL),
    query(LIST_CLIENT_IMPERSONATION_TARGETS_SQL),
  ]);

  const items = [
    {
      id: owner.id,
      name: owner.name,
      role: owner.role,
      roleLabel: owner.roleLabel,
      actorType: owner.actorType,
      companyName: "Tulip",
      status: "active",
    },
    ...companyResult.rows
      .filter((row) => String(row.status || "").toLowerCase() === "active")
      .map((row) => {
        const user = mapCompanyImpersonationUser(row);
        return {
          id: user.id,
          name: user.name,
          role: user.role,
          roleLabel: user.roleLabel,
          actorType: user.actorType,
          companyName: user.company?.name || row.name || "",
          status: "active",
        };
      }),
    ...staffResult.rows
      .filter((row) => String(row.status || "").toLowerCase() === "active")
      .map((row) => {
        const user = mapStaffUser(row);
        return {
          id: user.id,
          name: user.name,
          role: user.role,
          roleLabel: user.roleLabel,
          actorType: user.actorType,
          companyName: user.company?.name || "",
          status: "active",
        };
      }),
    ...clientResult.rows
      .filter((row) => String(row.status || "").toLowerCase() === "active")
      .map((row) => {
        const user = mapClientUser(row);
        return {
          id: user.id,
          name: user.name,
          role: user.role,
          roleLabel: user.roleLabel,
          actorType: user.actorType,
          companyName: user.company?.name || "",
          status: "active",
        };
      }),
  ];

  return items;
}

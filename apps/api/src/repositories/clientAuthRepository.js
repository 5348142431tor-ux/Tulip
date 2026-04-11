import crypto from "node:crypto";
import { query, withTransaction } from "../db.js";
import { getPropertyByCode } from "./propertiesRepository.js";
import {
  FIND_ACCESS_LINK_BY_CODE_SQL,
  FIND_CLIENTS_BY_TELEGRAM_SQL,
  FIND_STAFF_BY_TELEGRAM_SQL,
  INSERT_CLIENT_ACCESS_LINK_SQL,
  LIST_CLIENT_REQUESTS_BY_UNIT_SQL,
  LIST_UNIT_BALANCES_BY_UNIT_CODE_SQL,
  LIST_UNIT_CHARGES_BY_UNIT_CODE_SQL,
  LIST_UNIT_DOCUMENTS_FOR_CLIENT_SQL,
  TOUCH_ACCESS_LINK_SQL,
  UPDATE_CLIENT_TELEGRAM_USERNAME_SQL,
} from "../sql/clientAuth.js";
import { resolveTelegramCompanyAccess } from "./companyAuthRepository.js";

const MANAGEMENT_COMPANY_CODE = "MC-001";

function buildCabinetPath(accessCode) {
  return `/client-cabinet/access/${accessCode}`;
}

function mapBalanceRow(row) {
  return {
    currency: row.currency_code || "TRY",
    amount: Number(row.outstanding_amount || 0),
  };
}

function mapChargeRow(row) {
  return {
    id: row.id,
    period: String(row.charge_period || "").slice(0, 7),
    chargeDate: row.charge_period,
    chargeType: row.charge_type || "charge",
    chargeName: row.note || row.charge_type || "Начисление",
    amountDue: Number(row.amount_due || 0),
    amountPaid: Number(row.amount_paid || 0),
    currency: row.currency_code || "TRY",
    status: row.status || "unpaid",
    note: row.note || "",
  };
}

function buildHexCode() {
  return crypto.randomBytes(16).toString("hex");
}

async function getManagementCompanyId(client) {
  const result = await client.query(
    "SELECT id FROM management_companies WHERE code = $1 LIMIT 1",
    [MANAGEMENT_COMPANY_CODE]
  );

  if (!result.rows[0]?.id) {
    throw new Error("Management company seed was not found");
  }

  return result.rows[0].id;
}

async function ensureAccessLink(client, row) {
  if (row.access_code && row.access_link_status === "active") {
    return row.access_code;
  }

  const companyId = await getManagementCompanyId(client);
  const accessCode = buildHexCode();
  const insertResult = await client.query(INSERT_CLIENT_ACCESS_LINK_SQL, [
    companyId,
    row.client_id,
    row.unit_id,
    accessCode,
  ]);

  return insertResult.rows[0]?.access_code || accessCode;
}

export async function resolveTelegramClientAccess({ telegramId, telegramUsername }) {
  return withTransaction(async (client) => {
    const result = await client.query(FIND_CLIENTS_BY_TELEGRAM_SQL, [String(telegramId)]);

    if (!result.rows.length) {
      const error = new Error("Client with this Telegram account was not found");
      error.statusCode = 404;
      throw error;
    }

    const items = [];

    for (const row of result.rows) {
      if (telegramUsername) {
        await client.query(UPDATE_CLIENT_TELEGRAM_USERNAME_SQL, [
          row.client_id,
          telegramUsername,
        ]);
      }

      const accessCode = await ensureAccessLink(client, row);

      items.push({
        clientId: row.client_id,
        clientCode: row.client_code,
        clientName: row.client_name,
        propertyId: row.property_id,
        propertyCode: row.property_code,
        propertyTitle: row.property_title,
        unitId: row.unit_id,
        unitCode: row.unit_code,
        unitNumber: row.unit_number,
        accessCode,
        cabinetPath: buildCabinetPath(accessCode),
      });
    }

    return items;
  });
}

export async function resolveTelegramActorAccess({ telegramId, telegramUsername }) {
  try {
    const clientItems = await resolveTelegramClientAccess({
      telegramId,
      telegramUsername,
    });

    if (clientItems.length) {
      return {
        actorType: "client",
        items: clientItems,
      };
    }
  } catch (error) {
    if (error.statusCode && error.statusCode !== 404) {
      throw error;
    }
  }

  try {
    const companyAccess = await resolveTelegramCompanyAccess({
      telegramId,
      telegramUsername,
    });

    return {
      actorType: "company",
      accessCode: companyAccess.accessCode,
      cabinetPath: companyAccess.cabinetPath,
      company: companyAccess.company,
      role: companyAccess.role,
      mustChangePassword: companyAccess.mustChangePassword,
      staff: null,
    };
  } catch (error) {
    if (error.statusCode && error.statusCode !== 404) {
      throw error;
    }
  }

  const staffResult = await query(FIND_STAFF_BY_TELEGRAM_SQL, [String(telegramId)]);
  const staffRow = staffResult.rows[0];

  if (staffRow) {
    return {
      actorType: "company",
      company: {
        id: staffRow.management_company_id,
        code: staffRow.management_company_code,
        name: staffRow.management_company_name,
      },
      staff: {
        id: staffRow.staff_id,
        code: staffRow.staff_code,
        name: staffRow.staff_name,
        role: staffRow.staff_role,
        phone: staffRow.staff_phone || "",
      },
    };
  }

  const error = new Error("Telegram account was not linked to a client or company");
  error.statusCode = 404;
  throw error;
}

export async function getClientCabinetSessionByAccessCode(accessCode) {
  const accessResult = await query(FIND_ACCESS_LINK_BY_CODE_SQL, [accessCode]);
  const row = accessResult.rows[0];

  if (!row) {
    const error = new Error("Access link not found");
    error.statusCode = 404;
    throw error;
  }

  if (row.access_link_status !== "active") {
    const error = new Error("Access link is not active");
    error.statusCode = 403;
    throw error;
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    const error = new Error("Access link has expired");
    error.statusCode = 403;
    throw error;
  }

  await query(TOUCH_ACCESS_LINK_SQL, [row.access_link_id]);

  const property = await getPropertyByCode(row.property_code);
  const unit = property?.units?.find((item) => item.code === row.unit_code) || null;
  const balancesResult = await query(LIST_UNIT_BALANCES_BY_UNIT_CODE_SQL, [row.unit_code]);
  const chargesResult = await query(LIST_UNIT_CHARGES_BY_UNIT_CODE_SQL, [row.unit_code]);
  const documentsResult = await query(LIST_UNIT_DOCUMENTS_FOR_CLIENT_SQL, [
    row.unit_code,
    row.client_id,
  ]);
  const requestsResult = await query(LIST_CLIENT_REQUESTS_BY_UNIT_SQL, [
    row.unit_code,
    row.client_id,
  ]);

  return {
    accessCode,
    cabinetPath: buildCabinetPath(accessCode),
    client: {
      id: row.client_id,
      code: row.client_code,
      name: row.client_name,
      phone: row.client_phone || "",
      telegramId: row.telegram_id || "",
      telegramUsername: row.telegram_username || "",
    },
    property: property
      ? {
          id: property.id,
          code: property.code,
          title: property.title,
          city: property.city,
          district: property.district,
          status: property.status,
        }
      : {
          id: row.property_id,
          code: row.property_code,
          title: row.property_title,
          city: row.city,
          district: row.district,
          status: row.property_status,
        },
    unit: {
      id: row.unit_id,
      code: row.unit_code,
      number: row.unit_number,
      floor: row.floor_label || "-",
      area: Number(row.area_sqm || 0),
      layoutType: row.layout_type || "",
      layoutFeature: row.layout_feature || "",
      waterAccountNumber: row.water_account_number || "",
      electricityAccountNumber: row.electricity_account_number || "",
      residents: Number(row.resident_count || 0),
      status: row.unit_status,
      owners: unit?.owners || [],
      balances: balancesResult.rows.map(mapBalanceRow),
      chargeLogs: chargesResult.rows.map(mapChargeRow),
    },
    documents: documentsResult.rows.map((documentRow) => ({
      id: documentRow.id,
      code: documentRow.code,
      title: documentRow.title,
      type: documentRow.document_type,
      storageUrl: documentRow.storage_url || "",
      visibility: documentRow.visibility_scope,
      createdAt: documentRow.created_at,
    })),
    requests: requestsResult.rows.map((requestRow) => ({
      id: requestRow.id,
      code: requestRow.code,
      category: requestRow.category,
      title: requestRow.title,
      description: requestRow.description || "",
      priority: requestRow.priority,
      status: requestRow.status,
      source: requestRow.source,
      createdAt: requestRow.created_at,
      assignee: requestRow.assignee_name || "",
    })),
  };
}

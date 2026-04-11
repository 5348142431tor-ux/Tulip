import {
  ARCHIVE_PROPERTY_SQL,
  DECREASE_UNIT_BALANCE_SQL,
  DELETE_UNIT_OWNERSHIPS_SQL,
  FIND_CLIENT_BY_CODE_SQL,
  FIND_EXISTING_AIDAT_CHARGE_SQL,
  INSERT_CLIENT_SQL,
  INSERT_ACTIVITY_LOG_SQL,
  INSERT_CHARGE_SQL,
  INSERT_OWNERSHIP_SQL,
  INSERT_PROPERTY_SQL,
  INSERT_UNIT_SQL,
  LIST_PROPERTY_CHARGES_SQL,
  LIST_PROPERTY_ACTIVITY_LOGS_SQL,
  LIST_PROPERTY_UNIT_BALANCES_SQL,
  LIST_UNIT_OPEN_AIDAT_CHARGES_SQL,
  LIST_PROPERTIES_SQL,
  LOOKUP_PROPERTY_UNITS_SQL,
  LOOKUP_UNIT_SQL,
  PROPERTY_DETAIL_SQL,
  RESTORE_PROPERTY_SQL,
  STAFF_LOOKUP_SQL,
  UPSERT_UNIT_BALANCE_SQL,
  UPDATE_CHARGE_PAYMENT_SQL,
  UPDATE_PROPERTY_FINANCE_SQL,
  UPDATE_UNIT_PROFILE_SQL,
} from "../sql/properties.js";
import { query, withTransaction } from "../db.js";

const MANAGEMENT_COMPANY_CODE = "MC-001";

function toMonthStorageValue(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(normalized)) return `${normalized}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  return normalized;
}

function toMonthDisplayValue(value) {
  if (!value) return "";
  const normalized = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) return normalized.slice(0, 7);
  return normalized;
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

function mapPropertyListRow(row) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    city: row.city,
    district: row.district,
    type: row.property_type,
    aidatCalculationMode: row.aidat_calculation_mode || "equal_for_all",
    aidatStartDate: toMonthDisplayValue(row.aidat_start_date),
    aidatFixedAmount: row.aidat_fixed_amount === null ? "" : Number(row.aidat_fixed_amount || 0),
    aidatCurrencyCode: row.aidat_currency_code || "TRY",
    status: row.status,
    unitCount: Number(row.unit_count),
    manager: row.manager_name || "",
    totalBalances: Array.isArray(row.total_balances)
      ? row.total_balances.map((item) => ({
          currency: item.currency,
          amount: Number(item.amount || 0),
        }))
      : [],
  };
}

function mapPropertyDetail(rows) {
  if (!rows.length) return null;

  const first = rows[0];
  const unitsMap = new Map();

  rows.forEach((row) => {
    if (!row.unit_id) return;
    if (!unitsMap.has(row.unit_id)) {
      unitsMap.set(row.unit_id, {
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
        debt: 0,
        balances: [],
        chargeLogs: [],
        owners: [],
      });
    }

    if (row.client_id) {
      unitsMap.get(row.unit_id).owners.push({
        id: row.client_id,
        code: row.client_code,
        name: row.client_name,
        phone: row.client_phone || "",
        telegramId: row.client_telegram_id || "",
        share: Number(row.ownership_share || 0),
        isPrimary: Boolean(row.is_primary),
      });
    }
  });

  return {
    id: first.property_id,
    code: first.property_code,
    title: first.property_title,
    city: first.city,
    district: first.district,
    type: first.property_type,
    aidatCalculationMode: first.aidat_calculation_mode || "equal_for_all",
    aidatStartDate: toMonthDisplayValue(first.aidat_start_date),
    aidatFixedAmount:
      first.aidat_fixed_amount === null ? "" : Number(first.aidat_fixed_amount || 0),
    aidatCurrencyCode: first.aidat_currency_code || "TRY",
    status: first.property_status,
    unitCount: Number(first.unit_count || 0),
    manager: first.manager_name || "",
    units: Array.from(unitsMap.values()),
    totalBalances: [],
    financeLogs: [],
  };
}

function monthRange(startMonth) {
  const normalized = toMonthDisplayValue(startMonth);
  if (!normalized) return [];
  const [year, month] = normalized.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  const months = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function buildAidatLogMessage(propertyTitle, payload) {
  if (payload.aidatCalculationMode === "equal_for_all") {
    const amount =
      payload.aidatFixedAmount === "" || payload.aidatFixedAmount === undefined
        ? 0
        : Number(payload.aidatFixedAmount);
    const currency = payload.aidatCurrencyCode || "TRY";
    const startDate = toMonthDisplayValue(payload.aidatStartDate) || "не указан";
    return `С ${startDate} всем квартирам начисляется айдат ${amount} ${currency}.`;
  }

  const startDate = toMonthDisplayValue(payload.aidatStartDate) || "не указан";
  return `С ${startDate} всем квартирам начисляется айдат по размерам квартиры.`;
}

async function attachPropertyLogs(property) {
  if (!property?.code) return property;
  const logsResult = await query(LIST_PROPERTY_ACTIVITY_LOGS_SQL, [property.code]);
  return {
    ...property,
    financeLogs: logsResult.rows.map((row) => ({
      id: row.id,
      action: row.action,
      message: row.payload?.message || "",
      createdAt: row.created_at,
      payload: row.payload || {},
    })),
  };
}

function chargeTypeLabel(chargeType) {
  if (chargeType === "aidat") return "Айдат";
  if (chargeType === "water") return "Водоснабжение";
  if (chargeType === "electricity") return "Электричество";
  if (chargeType === "internet") return "Интернет";
  if (chargeType === "penalty") return "Штраф";
  return chargeType || "Начисление";
}

async function attachPropertyCharges(property) {
  if (!property?.code) return property;
  const chargesResult = await query(LIST_PROPERTY_CHARGES_SQL, [property.code]);
  const unitChargesMap = new Map();

  chargesResult.rows.forEach((row) => {
    const list = unitChargesMap.get(row.unit_code) || [];
    list.push({
      id: row.charge_id,
      period: toMonthDisplayValue(row.charge_period),
      chargeDate: row.charge_period,
      chargeType: row.charge_type || "charge",
      chargeName: row.note || chargeTypeLabel(row.charge_type),
      amountDue: Number(row.amount_due || 0),
      amountPaid: Number(row.amount_paid || 0),
      currency: row.currency_code || "TRY",
      status: row.status || "unpaid",
      note: row.note || "",
    });
    unitChargesMap.set(row.unit_code, list);
  });

  return {
    ...property,
    units: property.units.map((unit) => ({
      ...unit,
      chargeLogs: unitChargesMap.get(unit.code) || [],
      aidatPaymentLogs: [],
    })),
  };
}

async function attachUnitPaymentLogs(property) {
  if (!property?.units?.length) return property;
  const logsResult = await query(
    `SELECT id, entity_id, payload, created_at
     FROM activity_logs
     WHERE entity_type = 'unit' AND action = 'aidat_payment_added' AND entity_id = ANY($1::text[])
     ORDER BY created_at DESC`,
    [property.units.map((unit) => unit.code)]
  );

  const logsMap = new Map();
  logsResult.rows.forEach((row) => {
    const list = logsMap.get(row.entity_id) || [];
    list.push({
      id: row.id,
      amount: Number(row.payload?.amount || 0),
      appliedAmount: Number(row.payload?.appliedAmount || row.payload?.amount || 0),
      currency: row.payload?.currency || "TRY",
      receivedDate: row.payload?.receivedDate || "",
      recordedAt: row.created_at,
      note: row.payload?.note || "Оплата айдата",
    });
    logsMap.set(row.entity_id, list);
  });

  return {
    ...property,
    units: property.units.map((unit) => ({
      ...unit,
      aidatPaymentLogs: logsMap.get(unit.code) || [],
    })),
  };
}

async function attachPropertyBalances(property) {
  if (!property?.code) return property;
  const balancesResult = await query(LIST_PROPERTY_UNIT_BALANCES_SQL, [property.code]);
  const unitBalancesMap = new Map();
  const propertyBalanceMap = new Map();

  balancesResult.rows.forEach((row) => {
    const unitBalances = unitBalancesMap.get(row.unit_code) || [];
    unitBalances.push({
      currency: row.currency_code || "TRY",
      amount: Number(row.outstanding_amount || 0),
    });
    unitBalancesMap.set(row.unit_code, unitBalances);

    const currentTotal = propertyBalanceMap.get(row.currency_code || "TRY") || 0;
    propertyBalanceMap.set(
      row.currency_code || "TRY",
      currentTotal + Number(row.outstanding_amount || 0)
    );
  });

  const totalBalances = Array.from(propertyBalanceMap.entries()).map(([currency, amount]) => ({
    currency,
    amount,
  }));

  return {
    ...property,
    totalBalances,
    units: property.units.map((unit) => {
      const balances = unitBalancesMap.get(unit.code) || [];
      const tryBalance = balances.find((item) => item.currency === "TRY")?.amount || 0;
      return {
        ...unit,
        balances,
        debt: tryBalance,
      };
    }),
  };
}

export async function listProperties(options = {}) {
  const result = await query(LIST_PROPERTIES_SQL, [Boolean(options.includeArchived)]);
  return result.rows.map(mapPropertyListRow);
}

export async function getPropertyByCode(propertyCode) {
  const result = await query(PROPERTY_DETAIL_SQL, [propertyCode]);
  const propertyWithLogs = await attachPropertyLogs(mapPropertyDetail(result.rows));
  const propertyWithCharges = await attachPropertyCharges(propertyWithLogs);
  const propertyWithBalances = await attachPropertyBalances(propertyWithCharges);
  return attachUnitPaymentLogs(propertyWithBalances);
}

export async function createProperty(payload) {
  return withTransaction(async (client) => {
    const companyId = await getManagementCompanyId(client);
    const staffResult = await client.query(STAFF_LOOKUP_SQL, [payload.manager]);
    const staffId = staffResult.rows[0]?.id || null;

    const propertyInsert = await client.query(INSERT_PROPERTY_SQL, [
      companyId,
      payload.code,
      payload.title,
      payload.city,
      payload.district,
      payload.type,
      payload.aidatCalculationMode || "equal_for_all",
      toMonthStorageValue(payload.aidatStartDate),
      payload.aidatFixedAmount === "" || payload.aidatFixedAmount === undefined
        ? null
        : Number(payload.aidatFixedAmount),
      payload.aidatCurrencyCode || "TRY",
      payload.status,
      payload.unitCount,
      staffId,
    ]);

    const property = propertyInsert.rows[0];

    for (let index = 0; index < payload.unitCount; index += 1) {
      const unitNumber = String(index + 1);
      await client.query(INSERT_UNIT_SQL, [
        property.id,
        `${payload.code}-U${unitNumber}`,
        unitNumber,
        "-",
        0,
        null,
        null,
        null,
        null,
        0,
        "new",
      ]);
    }

    return property;
  });
}

function fallbackClientCode(unitCode, index) {
  return `${unitCode}-OWN-${String(index + 1).padStart(2, "0")}`;
}

export async function updateUnitOwners(unitCode, owners) {
  return withTransaction(async (client) => {
    const companyId = await getManagementCompanyId(client);
    const unitResult = await client.query(LOOKUP_UNIT_SQL, [unitCode]);
    const unit = unitResult.rows[0];

    if (!unit) {
      const error = new Error("Unit not found");
      error.statusCode = 404;
      throw error;
    }

    await client.query(DELETE_UNIT_OWNERSHIPS_SQL, [unit.id]);

    for (let index = 0; index < owners.length; index += 1) {
      const owner = owners[index];
      const clientCode = owner.code || fallbackClientCode(unit.code, index);

      let clientId;
      const existingClient = await client.query(FIND_CLIENT_BY_CODE_SQL, [clientCode]);

      if (existingClient.rows[0]?.id) {
        clientId = existingClient.rows[0].id;
        await client.query(
          `UPDATE clients
           SET full_name = $2, phone = $3, telegram_id = $4, updated_at = NOW()
           WHERE id = $1`,
          [clientId, owner.name, owner.phone || null, owner.telegramId || null]
        );
      } else {
        const insertedClient = await client.query(INSERT_CLIENT_SQL, [
          companyId,
          clientCode,
          owner.name,
          owner.phone || null,
          owner.telegramId || null,
        ]);
        clientId = insertedClient.rows[0].id;
      }

      await client.query(INSERT_OWNERSHIP_SQL, [
        unit.id,
        clientId,
        Number(owner.share || 0),
        index === 0,
      ]);
    }

    return getPropertyByCode(unit.property_code);
  });
}

export async function archiveProperty(propertyCode) {
  const result = await query(ARCHIVE_PROPERTY_SQL, [propertyCode]);
  if (!result.rows[0]?.code) {
    const error = new Error("Property not found");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

export async function restoreProperty(propertyCode) {
  const result = await query(RESTORE_PROPERTY_SQL, [propertyCode]);
  if (!result.rows[0]?.code) {
    const error = new Error("Property not found");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

export async function updateUnitProfile(unitCode, payload) {
  return withTransaction(async (client) => {
    const unitResult = await client.query(LOOKUP_UNIT_SQL, [unitCode]);
    const unit = unitResult.rows[0];

    if (!unit) {
      const error = new Error("Unit not found");
      error.statusCode = 404;
      throw error;
    }

    await client.query(UPDATE_UNIT_PROFILE_SQL, [
      unitCode,
      payload.floor || "-",
      Number(payload.area) || 0,
      payload.layoutType || null,
      payload.layoutFeature || null,
      payload.waterAccountNumber || null,
      payload.electricityAccountNumber || null,
    ]);

    return getPropertyByCode(unit.property_code);
  });
}

export async function updatePropertyFinance(propertyCode, payload) {
  return withTransaction(async (client) => {
    const companyId = await getManagementCompanyId(client);
    const result = await client.query(UPDATE_PROPERTY_FINANCE_SQL, [
      propertyCode,
      payload.aidatCalculationMode || "equal_for_all",
      toMonthStorageValue(payload.aidatStartDate),
      payload.aidatFixedAmount === "" || payload.aidatFixedAmount === undefined
        ? null
        : Number(payload.aidatFixedAmount),
      payload.aidatCurrencyCode || "TRY",
    ]);

    if (!result.rows[0]?.code) {
      const error = new Error("Property not found");
      error.statusCode = 404;
      throw error;
    }

    if (payload.aidatCalculationMode === "equal_for_all" && payload.aidatFixedAmount !== "") {
      const unitsResult = await client.query(LOOKUP_PROPERTY_UNITS_SQL, [propertyCode]);
      const months = monthRange(payload.aidatStartDate);
      const fixedAmount = Number(payload.aidatFixedAmount || 0);
      const currencyCode = payload.aidatCurrencyCode || "TRY";

      for (const unit of unitsResult.rows) {
        for (const monthDate of months) {
          const chargePeriod = monthDate.toISOString().slice(0, 10);
          const existingCharge = await client.query(FIND_EXISTING_AIDAT_CHARGE_SQL, [
            unit.id,
            chargePeriod,
          ]);

          if (existingCharge.rows[0]?.id) {
            continue;
          }

          const dueDate = new Date(monthDate);
          dueDate.setDate(1);

          await client.query(INSERT_CHARGE_SQL, [
            unit.id,
            chargePeriod,
            "aidat",
            fixedAmount,
            0,
            currencyCode,
            dueDate.toISOString().slice(0, 10),
            "unpaid",
            `Aidat ${toMonthDisplayValue(chargePeriod)}`,
          ]);

          await client.query(UPSERT_UNIT_BALANCE_SQL, [
            unit.id,
            currencyCode,
            fixedAmount,
          ]);
        }
      }
    }

    const property = await getPropertyByCode(propertyCode);
    const message = buildAidatLogMessage(property?.title || propertyCode, payload);

    await client.query(INSERT_ACTIVITY_LOG_SQL, [
      companyId,
      "admin",
      "system",
      "property",
      propertyCode,
      "aidat_settings_updated",
      JSON.stringify({
        message,
        aidatCalculationMode: payload.aidatCalculationMode || "equal_for_all",
        aidatStartDate: toMonthDisplayValue(payload.aidatStartDate),
        aidatFixedAmount:
          payload.aidatFixedAmount === "" || payload.aidatFixedAmount === undefined
            ? null
            : Number(payload.aidatFixedAmount),
        aidatCurrencyCode: payload.aidatCurrencyCode || "TRY",
      }),
    ]);

    return getPropertyByCode(propertyCode);
  });
}

export async function addAidatPayment(unitCode, payload) {
  return withTransaction(async (client) => {
    const companyId = await getManagementCompanyId(client);
    const unitResult = await client.query(LOOKUP_UNIT_SQL, [unitCode]);
    const unit = unitResult.rows[0];

    if (!unit) {
      const error = new Error("Unit not found");
      error.statusCode = 404;
      throw error;
    }

    let remaining = Number(payload.amount || 0);
    if (remaining <= 0) {
      const error = new Error("Payment amount must be greater than 0");
      error.statusCode = 400;
      throw error;
    }

    const currency = payload.currency || "TRY";
    const chargesResult = await client.query(LIST_UNIT_OPEN_AIDAT_CHARGES_SQL, [unitCode, currency]);
    if (!chargesResult.rows.length) {
      const error = new Error("No open aidat charges found for this currency");
      error.statusCode = 400;
      throw error;
    }

    for (const charge of chargesResult.rows) {
      if (remaining <= 0) break;
      const outstanding = Number(charge.amount_due || 0) - Number(charge.amount_paid || 0);
      if (outstanding <= 0) continue;
      const applied = Math.min(outstanding, remaining);
      const nextPaid = Number(charge.amount_paid || 0) + applied;
      const nextStatus = nextPaid >= Number(charge.amount_due || 0) ? "paid" : "partial";

      await client.query(UPDATE_CHARGE_PAYMENT_SQL, [charge.id, nextPaid, nextStatus]);
      remaining -= applied;
    }

    const appliedAmount = Number(payload.amount || 0) - remaining;
    if (appliedAmount <= 0) {
      const error = new Error("No aidat amount was applied");
      error.statusCode = 400;
      throw error;
    }

    await client.query(DECREASE_UNIT_BALANCE_SQL, [unit.id, currency, appliedAmount]);

    await client.query(INSERT_ACTIVITY_LOG_SQL, [
      companyId,
      "admin",
      "system",
      "unit",
      unitCode,
      "aidat_payment_added",
      JSON.stringify({
        amount: Number(payload.amount || 0),
        appliedAmount,
        currency,
        receivedDate: payload.receivedDate || null,
        note: "Оплата айдата",
      }),
    ]);

    return getPropertyByCode(unit.property_code);
  });
}

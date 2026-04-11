import {
  addAidatPayment,
  archiveProperty,
  createProperty,
  getPropertyByCode,
  listProperties,
  restoreProperty,
  updatePropertyFinance,
  updateUnitProfile,
  updateUnitOwners,
} from "../repositories/propertiesRepository.js";
import {
  assertPropertyCreateAccess,
  assertPropertyListAccess,
  assertPropertyManageAccess,
  assertPropertyReadAccess,
} from "../auth/requestAccess.js";

function nextPropertyCode(properties) {
  const maxValue = properties.reduce((max, property) => {
    const numeric = Number(String(property.code || "").replace("OBJ-", ""));
    return Number.isNaN(numeric) ? max : Math.max(max, numeric);
  }, 0);

  return `OBJ-${String(maxValue + 1).padStart(3, "0")}`;
}

function propertyCodeFromUnitCode(unitCode) {
  const normalized = String(unitCode || "").trim();
  const markerIndex = normalized.indexOf("-U");
  return markerIndex >= 0 ? normalized.slice(0, markerIndex) : normalized;
}

async function getManagedPropertyByUnitCode(unitCode) {
  return getPropertyByCode(propertyCodeFromUnitCode(unitCode));
}

function scopePropertiesForAccess(properties, access) {
  if (access.role === "manager") {
    return properties.filter((property) => property.manager === access.userName);
  }

  return properties;
}

export async function propertyRoutes(fastify) {
  fastify.get("/api/properties", async (request) => {
    const access = assertPropertyListAccess(request);
    const properties = await listProperties({
      includeArchived:
        request.query?.includeArchived === "1" ||
        request.query?.includeArchived === "true",
    });

    return { items: scopePropertiesForAccess(properties, access) };
  });

  fastify.get("/api/properties/:propertyCode", async (request, reply) => {
    const property = await getPropertyByCode(request.params.propertyCode);

    if (!property) {
      reply.code(404);
      return { message: "Property not found" };
    }

    assertPropertyReadAccess(request, property);
    return { item: property };
  });

  fastify.post("/api/properties", async (request, reply) => {
    assertPropertyCreateAccess(request);

    const body = request.body || {};
    const currentProperties = await listProperties();

    if (!body.title || !body.city || !body.district || !body.manager) {
      reply.code(400);
      return { message: "title, city, district, and manager are required" };
    }

    const created = await createProperty({
      code: nextPropertyCode(currentProperties),
      title: body.title,
      city: body.city,
      district: body.district,
      type: body.type || "residential_building",
      status: body.status || "active",
      manager: body.manager,
      unitCount: Math.max(1, Number(body.unitCount) || 1),
    });

    reply.code(201);
    return {
      item: await getPropertyByCode(created.code),
    };
  });

  fastify.put("/api/units/:unitCode/owners", async (request, reply) => {
    const body = request.body || {};

    if (!Array.isArray(body.owners) || body.owners.length === 0) {
      reply.code(400);
      return { message: "owners array is required" };
    }

    const property = await getManagedPropertyByUnitCode(request.params.unitCode);

    if (!property) {
      reply.code(404);
      return { message: "Property not found" };
    }

    assertPropertyManageAccess(request, property);

    const updatedProperty = await updateUnitOwners(request.params.unitCode, body.owners);
    return { item: updatedProperty };
  });

  fastify.put("/api/units/:unitCode/profile", async (request, reply) => {
    const property = await getManagedPropertyByUnitCode(request.params.unitCode);

    if (!property) {
      reply.code(404);
      return { message: "Property not found" };
    }

    assertPropertyManageAccess(request, property);

    const body = request.body || {};
    const updatedProperty = await updateUnitProfile(request.params.unitCode, {
      floor: body.floor,
      area: body.area,
      layoutType: body.layoutType,
      layoutFeature: body.layoutFeature,
      waterAccountNumber: body.waterAccountNumber,
      electricityAccountNumber: body.electricityAccountNumber,
    });
    return { item: updatedProperty };
  });

  fastify.put("/api/properties/:propertyCode/finance", async (request, reply) => {
    const property = await getPropertyByCode(request.params.propertyCode);

    if (!property) {
      reply.code(404);
      return { message: "Property not found" };
    }

    assertPropertyManageAccess(request, property);

    const body = request.body || {};
    const updatedProperty = await updatePropertyFinance(request.params.propertyCode, {
      aidatCalculationMode: body.aidatCalculationMode,
      aidatStartDate: body.aidatStartDate,
      aidatFixedAmount: body.aidatFixedAmount,
      aidatCurrencyCode: body.aidatCurrencyCode,
    });
    return { item: updatedProperty };
  });

  fastify.post("/api/units/:unitCode/aidat-payment", async (request, reply) => {
    const body = request.body || {};

    if (!body.amount || Number(body.amount) <= 0 || !body.receivedDate) {
      reply.code(400);
      return { message: "amount and receivedDate are required" };
    }

    const property = await getManagedPropertyByUnitCode(request.params.unitCode);

    if (!property) {
      reply.code(404);
      return { message: "Property not found" };
    }

    assertPropertyManageAccess(request, property);

    const updatedProperty = await addAidatPayment(request.params.unitCode, {
      amount: body.amount,
      currency: body.currency,
      receivedDate: body.receivedDate,
    });
    return { item: updatedProperty };
  });

  fastify.patch("/api/properties/:propertyCode/archive", async (request, reply) => {
    const property = await getPropertyByCode(request.params.propertyCode);

    if (!property) {
      reply.code(404);
      return { message: "Property not found" };
    }

    assertPropertyManageAccess(request, property);

    const archived = await archiveProperty(request.params.propertyCode);
    return {
      item: await getPropertyByCode(archived.code),
    };
  });

  fastify.patch("/api/properties/:propertyCode/restore", async (request, reply) => {
    const property = await getPropertyByCode(request.params.propertyCode);

    if (!property) {
      reply.code(404);
      return { message: "Property not found" };
    }

    const access = assertPropertyManageAccess(request, property);
    const body = request.body || {};

    if (body.targetCompanyId && access.role !== "project_owner") {
      reply.code(403);
      return { message: "Only the platform creator can restore a house to another company" };
    }

    const restored = await restoreProperty(request.params.propertyCode, {
      targetCompanyId: body.targetCompanyId,
    });
    return {
      item: await getPropertyByCode(restored.code),
    };
  });
}

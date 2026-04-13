import {
  createManager,
  deleteManager,
  listManagers,
  updateManager,
} from "../repositories/managerRepository.js";
import { assertViewAccess, getRequestAccess } from "../auth/requestAccess.js";

function assertManagerManageAccess(request) {
  const access = getRequestAccess(request);
  if (!["project_owner", "company_admin"].includes(access.role)) {
    const error = new Error("Only the platform creator or company admin can manage managers");
    error.statusCode = 403;
    throw error;
  }
  return access;
}

function resolveCompanyId(access, explicitCompanyId = "") {
  if (access.company?.id) {
    return access.company.id;
  }

  const nextCompanyId = String(explicitCompanyId || "").trim();
  if (access.role === "project_owner" && nextCompanyId) {
    return nextCompanyId;
  }

  const error = new Error("Company context is required");
  error.statusCode = 400;
  throw error;
}

export async function managerRoutes(fastify) {
  fastify.get("/api/managers", async (request) => {
    const access = assertViewAccess(request, "managers");
    return {
      items: await listManagers(resolveCompanyId(access, request.query?.companyId)),
    };
  });

  fastify.post("/api/managers", async (request, reply) => {
    const access = assertManagerManageAccess(request);
    const body = request.body || {};

    if (!body.name) {
      reply.code(400);
      return { message: "name is required" };
    }

    if (!body.login) {
      reply.code(400);
      return { message: "login is required" };
    }

    if (!body.password) {
      reply.code(400);
      return { message: "password is required" };
    }

    const item = await createManager({
      companyId: resolveCompanyId(access, body.companyId),
      login: body.login,
      password: body.password,
      name: body.name,
      phone: body.phone,
      email: body.email,
      status: body.status,
      canRecordClientPayments: body.canRecordClientPayments,
    });

    reply.code(201);
    return { item };
  });

  fastify.put("/api/managers/:managerId", async (request, reply) => {
    const access = assertManagerManageAccess(request);
    const body = request.body || {};

    if (!body.name) {
      reply.code(400);
      return { message: "name is required" };
    }

    if (!body.login) {
      reply.code(400);
      return { message: "login is required" };
    }

    return {
      item: await updateManager(request.params.managerId, {
        companyId: resolveCompanyId(access, body.companyId),
        login: body.login,
        password: body.password,
        name: body.name,
        phone: body.phone,
        email: body.email,
        status: body.status,
        canRecordClientPayments: body.canRecordClientPayments,
      }),
    };
  });

  fastify.delete("/api/managers/:managerId", async (request) => {
    const access = assertManagerManageAccess(request);
    return {
      item: await deleteManager(request.params.managerId, resolveCompanyId(access)),
    };
  });
}

import {
  createCompany,
  deleteCompany,
  getCompanyProfileByCode,
  listCompanies,
  updateCompany,
  updateCompanyProfile,
} from "../repositories/companyRepository.js";
import {
  assertCompanyManageAccess,
  assertCompanyReadAccess,
  assertCurrentCompanyProfileAccess,
} from "../auth/requestAccess.js";

export async function companyRoutes(fastify) {
  fastify.get("/api/company-profile", async (request) => {
    const access = assertCurrentCompanyProfileAccess(request);

    return {
      item: await getCompanyProfileByCode(access.company.code),
    };
  });

  fastify.put("/api/company-profile", async (request, reply) => {
    const access = assertCurrentCompanyProfileAccess(request);
    const body = request.body || {};

    if (!body.title) {
      reply.code(400);
      return { message: "title is required" };
    }

    return {
      item: await updateCompanyProfile(access.company.code, {
        title: body.title,
        directorName: body.directorName,
      }),
    };
  });

  fastify.get("/api/companies", async (request) => {
    assertCompanyReadAccess(request);

    return {
      items: await listCompanies(),
    };
  });

  fastify.post("/api/companies", async (request, reply) => {
    assertCompanyManageAccess(request);

    const body = request.body || {};

    if (!body.companyId) {
      reply.code(400);
      return { message: "companyId is required" };
    }

    const item = await createCompany({
      companyId: body.companyId,
      title: body.title,
      directorName: body.directorName,
      telegramId: body.telegramId,
      telegramUsername: body.telegramUsername,
      status: body.status,
    });

    reply.code(201);
    return { item };
  });

  fastify.put("/api/companies/:companyId", async (request, reply) => {
    assertCompanyManageAccess(request);

    const body = request.body || {};

    if (!body.title) {
      reply.code(400);
      return { message: "title is required" };
    }

    return {
      item: await updateCompany(request.params.companyId, {
        title: body.title,
        directorName: body.directorName,
        telegramId: body.telegramId,
        telegramUsername: body.telegramUsername,
        status: body.status,
      }),
    };
  });

  fastify.delete("/api/companies/:companyId", async (request) => {
    assertCompanyManageAccess(request);

    return {
      item: await deleteCompany(request.params.companyId),
    };
  });
}

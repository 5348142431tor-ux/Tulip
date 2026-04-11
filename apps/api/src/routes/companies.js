import {
  createCompany,
  deleteCompany,
  listCompanies,
  updateCompany,
} from "../repositories/companyRepository.js";

export async function companyRoutes(fastify) {
  fastify.get("/api/companies", async () => {
    return {
      items: await listCompanies(),
    };
  });

  fastify.post("/api/companies", async (request, reply) => {
    const body = request.body || {};

    if (!body.companyId) {
      reply.code(400);
      return { message: "companyId is required" };
    }

    const item = await createCompany({
      companyId: body.companyId,
      title: body.title,
      telegramId: body.telegramId,
      telegramUsername: body.telegramUsername,
      status: body.status,
    });

    reply.code(201);
    return { item };
  });

  fastify.put("/api/companies/:companyId", async (request, reply) => {
    const body = request.body || {};

    if (!body.title) {
      reply.code(400);
      return { message: "title is required" };
    }

    return {
      item: await updateCompany(request.params.companyId, {
        title: body.title,
        telegramId: body.telegramId,
        telegramUsername: body.telegramUsername,
        status: body.status,
      }),
    };
  });

  fastify.delete("/api/companies/:companyId", async (request) => {
    return {
      item: await deleteCompany(request.params.companyId),
    };
  });
}

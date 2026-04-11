import {
  changeCompanyPasswordByAccessCode,
  getCompanyAccessSessionByCode,
  loginCompanyByAccessCode,
  resolveTelegramCompanyAccess,
} from "../repositories/companyAuthRepository.js";

export async function companyAuthRoutes(fastify) {
  fastify.post("/api/company-auth/telegram/start", async (request, reply) => {
    const body = request.body || {};

    if (!body.telegramId) {
      reply.code(400);
      return { message: "telegramId is required" };
    }

    return {
      item: await resolveTelegramCompanyAccess({
        telegramId: body.telegramId,
        telegramUsername: body.telegramUsername || "",
      }),
    };
  });

  fastify.get("/api/company-auth/access/:accessCode", async (request) => {
    return {
      item: await getCompanyAccessSessionByCode(request.params.accessCode),
    };
  });

  fastify.post("/api/company-auth/login", async (request, reply) => {
    const body = request.body || {};

    if (!body.accessCode || !body.password) {
      reply.code(400);
      return { message: "accessCode and password are required" };
    }

    return {
      item: await loginCompanyByAccessCode(body.accessCode, body.password),
    };
  });

  fastify.post("/api/company-auth/change-password", async (request, reply) => {
    const body = request.body || {};

    if (!body.accessCode || !body.currentPassword || !body.newPassword) {
      reply.code(400);
      return {
        message: "accessCode, currentPassword, and newPassword are required",
      };
    }

    return {
      item: await changeCompanyPasswordByAccessCode(
        body.accessCode,
        body.currentPassword,
        body.newPassword
      ),
    };
  });
}

import {
  getClientCabinetSessionByAccessCode,
  resolveTelegramActorAccess,
  resolveTelegramClientAccess,
} from "../repositories/clientAuthRepository.js";

export async function clientAuthRoutes(fastify) {
  fastify.post("/api/client-auth/telegram/start", async (request, reply) => {
    const body = request.body || {};

    if (!body.telegramId) {
      reply.code(400);
      return { message: "telegramId is required" };
    }

    const items = await resolveTelegramClientAccess({
      telegramId: body.telegramId,
      telegramUsername: body.telegramUsername || "",
    });

    return {
      items,
      message:
        items.length === 1
          ? "Telegram account is linked to one apartment"
          : "Telegram account is linked to multiple apartments",
    };
  });

  fastify.post("/api/telegram/resolve-user", async (request, reply) => {
    const body = request.body || {};

    if (!body.telegramId) {
      reply.code(400);
      return { message: "telegramId is required" };
    }

    const result = await resolveTelegramActorAccess({
      telegramId: body.telegramId,
      telegramUsername: body.telegramUsername || "",
    });

    return result;
  });

  fastify.get("/api/client-auth/access/:accessCode", async (request) => {
    const session = await getClientCabinetSessionByAccessCode(
      request.params.accessCode
    );

    return { item: session };
  });
}

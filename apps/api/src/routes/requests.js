import { getRequestAccess } from "../auth/requestAccess.js";
import { createClientRequest, listRequests, reviewCompletedRequest, updateRequestStatus } from "../repositories/requestRepository.js";

export async function requestRoutes(fastify) {
  fastify.get("/api/requests", async (request) => {
    const access = getRequestAccess(request);
    return {
      items: await listRequests(access),
    };
  });

  fastify.post("/api/requests", async (request, reply) => {
    const access = getRequestAccess(request);
    if (access.role !== "client") {
      const error = new Error("Только клиент может создать заявку из своего кабинета");
      error.statusCode = 403;
      throw error;
    }

    const body = request.body || {};
    const item = await createClientRequest({
      clientCode: access.clientId,
      unitCode: body.unitCode,
      description: body.description,
      attachmentUrl: body.attachmentUrl,
    });

    reply.code(201);
    return { item };
  });

  fastify.patch("/api/requests/:requestCode/status", async (request) => {
    const access = getRequestAccess(request);
    if (!["manager", "company_admin", "project_owner"].includes(access.role)) {
      const error = new Error("Недостаточно прав для изменения статуса заявки");
      error.statusCode = 403;
      throw error;
    }

    return {
      item: await updateRequestStatus({
        access,
        requestCode: request.params.requestCode,
        status: request.body?.status,
        cancelComment: request.body?.cancelComment,
      }),
    };
  });


  fastify.patch("/api/requests/:requestCode/client-review", async (request) => {
    const access = getRequestAccess(request);
    if (access.role !== "client") {
      const error = new Error("Только клиент может принять или вернуть выполненную заявку");
      error.statusCode = 403;
      throw error;
    }

    return {
      item: await reviewCompletedRequest({
        access,
        requestCode: request.params.requestCode,
        action: request.body?.action,
        comment: request.body?.comment,
      }),
    };
  });
}

import {
  createAdminSessionToken,
  getBearerToken,
  verifyAdminSessionToken,
} from "../auth/adminSession.js";
import {
  listImpersonationTargets,
  loginAdminActor,
  resolveImpersonationTarget,
} from "../repositories/adminAuthRepository.js";

function resolveOwnerController(session) {
  if (session.user?.role === "project_owner") {
    return session.user;
  }

  if (session.impersonator?.role === "project_owner") {
    return session.impersonator;
  }

  const error = new Error("Only the platform creator can impersonate other users");
  error.statusCode = 403;
  throw error;
}

export async function adminAuthRoutes(fastify) {
  fastify.post("/api/admin-auth/login", async (request, reply) => {
    const body = request.body || {};
    const user = await loginAdminActor({
      login: body.login,
      password: body.password,
    });

    const item = verifyAdminSessionToken(createAdminSessionToken({ user }));
    reply.code(201);
    return { item };
  });

  fastify.get("/api/admin-auth/session", async (request) => {
    const token = getBearerToken(request);
    return {
      item: verifyAdminSessionToken(token),
    };
  });

  fastify.get("/api/admin-auth/targets", async (request) => {
    const token = getBearerToken(request);
    const session = verifyAdminSessionToken(token);
    resolveOwnerController(session);

    return {
      items: await listImpersonationTargets(),
    };
  });

  fastify.post("/api/admin-auth/impersonate", async (request, reply) => {
    const token = getBearerToken(request);
    const session = verifyAdminSessionToken(token);
    const owner = resolveOwnerController(session);
    const body = request.body || {};
    const user = await resolveImpersonationTarget(body.targetId);

    const item = verifyAdminSessionToken(
      createAdminSessionToken({
        user,
        impersonator: owner,
      })
    );

    reply.code(201);
    return { item };
  });

  fastify.post("/api/admin-auth/restore", async (request, reply) => {
    const token = getBearerToken(request);
    const session = verifyAdminSessionToken(token);

    if (!session.impersonator?.role || session.impersonator.role !== "project_owner") {
      const error = new Error("No creator impersonation session to restore");
      error.statusCode = 400;
      throw error;
    }

    const item = verifyAdminSessionToken(
      createAdminSessionToken({
        user: session.impersonator,
      })
    );

    reply.code(201);
    return { item };
  });
}

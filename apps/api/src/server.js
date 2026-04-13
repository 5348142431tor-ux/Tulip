import Fastify from "fastify";
import cors from "@fastify/cors";
import { propertyRoutes } from "./routes/properties.js";
import { clientAuthRoutes } from "./routes/clientAuth.js";
import { companyRoutes } from "./routes/companies.js";
import { companyAuthRoutes } from "./routes/companyAuth.js";
import { adminAuthRoutes } from "./routes/adminAuth.js";
import { managerRoutes } from "./routes/managers.js";
import { requestRoutes } from "./routes/requests.js";
import { getConfig } from "./config.js";
import { query, closePool } from "./db.js";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

app.get("/health", async () => {
  const result = await query("SELECT NOW() AS now");
  return {
    status: "ok",
    database: "connected",
    now: result.rows[0]?.now,
  };
});

await app.register(adminAuthRoutes);
await app.register(managerRoutes);
await app.register(requestRoutes);
await app.register(propertyRoutes);
await app.register(clientAuthRoutes);
await app.register(companyRoutes);
await app.register(companyAuthRoutes);

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.code(error.statusCode || 500).send({
    message: error.message || "Internal server error",
  });
});

const { port, host } = getConfig();

const start = async () => {
  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  await closePool();
  await app.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closePool();
  await app.close();
  process.exit(0);
});

start();

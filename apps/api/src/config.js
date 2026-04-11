export function getConfig() {
  return {
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || "127.0.0.1",
    databaseUrl:
      process.env.DATABASE_URL ||
      "postgresql://tulip:tulip_dev_password@localhost:5432/tulip",
  };
}

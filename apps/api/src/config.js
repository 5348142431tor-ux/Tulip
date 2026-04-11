export function getConfig() {
  return {
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || "127.0.0.1",
    databaseUrl:
      process.env.DATABASE_URL ||
      "postgresql://tulip:tulip_dev_password@localhost:5432/tulip",
    adminSessionSecret:
      process.env.ADMIN_SESSION_SECRET || "tulip_dev_admin_session_secret_change_me",
    platformOwnerId: process.env.PLATFORM_OWNER_ID || "OWNER-01",
    platformOwnerName: process.env.PLATFORM_OWNER_NAME || "Aidima",
    platformOwnerLogin: process.env.PLATFORM_OWNER_LOGIN || "owner",
    platformOwnerPasswordHash:
      process.env.PLATFORM_OWNER_PASSWORD_HASH ||
      "996d502fc3746b0ec9c1d4be9df176c6:97cc9b5854218f9c1af8bdb772fa74f8c0cfd08e46e6472b05fd2a39319e4124ba4b24c3fd605e8456c5b1213b9696cf6fe768e1f00b50cac7b0e852267c3d50",
  };
}

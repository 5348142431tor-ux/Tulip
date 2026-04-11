import pg from "pg";
import { getConfig } from "./config.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: getConfig().databaseUrl,
});

export async function query(sql, params = []) {
  return pool.query(sql, params);
}

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}

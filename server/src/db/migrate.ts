import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pool } from "./pool.ts";

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../migrations");

async function waitForDatabase() {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 30) throw lastError;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export async function migrate() {
  await waitForDatabase();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const done = await pool.query(`SELECT 1 FROM schema_migrations WHERE filename = $1`, [file]);
    if (done.rowCount) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [file]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

const invoked = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (invoked) {
  migrate()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

import { pool, type Queryable } from "./pool.ts";

export async function withTransaction<T>(fn: (client: Queryable) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  const queryable = client as unknown as Queryable;
  try {
    await client.query("BEGIN");
    const result = await fn(queryable);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

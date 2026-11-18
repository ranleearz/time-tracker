import pg from "pg";
import { config } from "../config.ts";

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

export type Queryable = {
  query: <T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values?: unknown[],
  ) => Promise<pg.QueryResult<T>>;
};

export const db = pool as unknown as Queryable;

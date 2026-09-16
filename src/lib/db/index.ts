import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/lib/db/schema";

/**
 * PostgreSQL connection for the KeedoHub application.
 *
 * Server-only and fully lazy: importing this module (and modules that use it,
 * such as the auth server) never opens a connection or reads configuration.
 * The real client is created on the first query — important for builds and
 * edge cases where no database is reachable.
 */
const globalForDb = globalThis as unknown as {
  keedohubSql?: postgres.Sql;
  keedohubDb?: ReturnType<typeof drizzle>;
};

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env (see .env.example) before using the database.",
    );
  }

  const sql = globalForDb.keedohubSql ?? postgres(databaseUrl, {
    // Session-based auth does not need more; keeps connection count low.
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db = globalForDb.keedohubDb ?? drizzle(sql, { schema });

  globalForDb.keedohubSql = sql;
  globalForDb.keedohubDb = db;

  return db;
}

type Drizzle = PostgresJsDatabase<typeof schema> & { $client: postgres.Sql };

/**
 * Lazily-initialised Drizzle instance. A proxy defers construction until the
 * first property access, so module import stays side-effect free.
 */
export function getDb(): Drizzle {
  return new Proxy({} as Drizzle, {
    get(_target, prop, receiver) {
      const db = createDb() as unknown as Record<string | symbol, unknown>;
      const value = Reflect.get(db, prop, receiver);
      return typeof value === "function" ? value.bind(db) : value;
    },
    has(_target, prop) {
      return Reflect.has(createDb() as unknown as object, prop);
    },
  });
}

export type Database = Drizzle;
export { schema };
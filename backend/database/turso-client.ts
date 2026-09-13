import { createClient } from "@libsql/client";

/** Server-only project database credentials; never expose TURSO_AUTH_TOKEN to the browser. */
const tursoDatabaseUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoDatabaseUrl) {
  throw new Error("Missing TURSO_DATABASE_URL in .env.local.");
}

if (!tursoAuthToken) {
  throw new Error("Missing TURSO_AUTH_TOKEN in .env.local.");
}

/** Shared Turso client for project tables; Better Auth uses its Kysely connection. */
export const turso = createClient({
  url: tursoDatabaseUrl,
  authToken: tursoAuthToken,
});

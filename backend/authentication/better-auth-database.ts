import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely } from "kysely";

/** Server-only credentials for the database shared by Better Auth and project profiles. */
const databaseUrl = process.env.TURSO_DATABASE_URL;
const databaseToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl) {
  throw new Error("Missing TURSO_DATABASE_URL in .env.local.");
}

if (!databaseToken) {
  throw new Error("Missing TURSO_AUTH_TOKEN in .env.local.");
}

/** Better Auth's Kysely connection; project queries use the separate Turso client. */
export const betterAuthDatabase = new Kysely<Record<string, never>>({
  dialect: new LibsqlDialect({
    url: databaseUrl,
    authToken: databaseToken,
  }),
});

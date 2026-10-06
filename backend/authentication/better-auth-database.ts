import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely } from "kysely";
import { requireEnvironmentVariable } from "@/backend/configuration/environment";

/** Server-only credentials for the shared database. */
const databaseUrl = requireEnvironmentVariable("TURSO_DATABASE_URL");
const databaseToken = requireEnvironmentVariable("TURSO_AUTH_TOKEN");

/** Better Auth's connection; project queries use the separate Turso client. */
export const betterAuthDatabase = new Kysely<Record<string, never>>({
  dialect: new LibsqlDialect({
    url: databaseUrl,
    authToken: databaseToken,
  }),
});

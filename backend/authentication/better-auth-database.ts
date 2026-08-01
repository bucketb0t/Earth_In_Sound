import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely } from "kysely";

/**
 * Better Auth database credentials.
 * Uses the same Turso database as the project tables without exposing secrets.
 *
 * Better Auth needs a database connection for its own tables. This connection
 * is intentionally separate from the app's turso-client.ts file so it is clear
 * which code path belongs to auth internals and which belongs to Earth In Sound
 * profile/role data.
 */
const databaseUrl = process.env.TURSO_DATABASE_URL;
const databaseToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl) {
  throw new Error("Missing TURSO_DATABASE_URL in .env.local.");
}

if (!databaseToken) {
  throw new Error("Missing TURSO_AUTH_TOKEN in .env.local.");
}

/**
 * Kysely connection used only by Better Auth.
 * Better Auth owns its auth tables; project profile data stays in users.
 *
 * Kysely is the SQL builder Better Auth expects. LibsqlDialect is the adapter
 * that lets Kysely speak to Turso/libSQL. Better Auth uses this connection to
 * create and query tables like user, account, session, and verification.
 */
export const betterAuthDatabase = new Kysely<Record<string, never>>({
  /*
   * LibSQL dialect lets Better Auth speak SQL to Turso through Kysely.
   */
  dialect: new LibsqlDialect({
    url: databaseUrl,
    authToken: databaseToken,
  }),
});

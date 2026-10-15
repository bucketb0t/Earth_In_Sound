import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely } from "kysely";
import { databaseConfiguration } from "@/backend/database/database-configuration";

/** Better Auth's Kysely adapter uses the shared database configuration. */
export const betterAuthDatabase = new Kysely<Record<string, never>>({
  dialect: new LibsqlDialect(databaseConfiguration),
});

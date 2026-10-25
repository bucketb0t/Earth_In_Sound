import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely } from "kysely";
import type { DatabaseConfiguration } from "./database-configuration";

/** Create Better Auth's Kysely adapter from explicit database configuration. */
export function createBetterAuthDatabase(
  configuration: DatabaseConfiguration,
): Kysely<Record<string, never>> {
  return new Kysely<Record<string, never>>({
    dialect: new LibsqlDialect(configuration),
  });
}

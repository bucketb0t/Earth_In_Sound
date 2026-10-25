import { createBetterAuthDatabase } from "./better-auth-database";
import { readDatabaseConfiguration } from "./database-configuration";
import { createTursoClient } from "./turso-client";

export const databaseConfiguration = readDatabaseConfiguration(process.env);
export const turso = createTursoClient(databaseConfiguration);
export const betterAuthDatabase = createBetterAuthDatabase(
  databaseConfiguration,
);

/** Production database adapters sharing one immutable configuration. */
export const databaseModule = Object.freeze({
  configuration: databaseConfiguration,
  project: turso,
  authentication: betterAuthDatabase,
});

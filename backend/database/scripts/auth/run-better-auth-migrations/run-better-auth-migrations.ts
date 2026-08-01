import { pathToFileURL } from "node:url";
import { getMigrations } from "better-auth/db/migration";
import { loadEnvConfig } from "@next/env";

/**
 * Loads .env.local before importing the auth config.
 * The auth config needs Turso credentials and BETTER_AUTH_SECRET.
 */
loadEnvConfig(process.cwd());

/**
 * Creates or updates Better Auth tables in Turso.
 *
 * Better Auth owns its own schema. Instead of manually writing SQL for auth
 * tables, this asks Better Auth which migrations it needs and runs them against
 * the configured Turso database.
 */
export async function runBetterAuthMigrationsScript(): Promise<void> {
  /*
   * Dynamic import waits until .env.local is loaded before auth initializes.
   */
  const { auth } = await import("../../../../authentication/auth");
  const { runMigrations } = await getMigrations(auth.options);

  await runMigrations();
  console.log("Better Auth migrations finished.");
}

/**
 * Allows this file to run by itself from the terminal.
 */
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runBetterAuthMigrationsScript().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

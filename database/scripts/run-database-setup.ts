import { runBetterAuthMigrationsScript } from "./auth/run-better-auth-migrations/run-better-auth-migrations";
import { runCreateLocalOwnerScript } from "./users/create-local-owner/create-local-owner";

/**
 * Database setup script hub.
 * Add future setup scripts to this list so one command can run all setup.
 *
 * This file is intentionally small: it is the "run everything needed to prepare
 * the database" entry point. Each script stays in its own folder, and this hub
 * decides the order.
 */
const databaseScripts = [
  {
    name: "auth/run-better-auth-migrations",
    run: runBetterAuthMigrationsScript,
  },
  {
    name: "users/create-local-owner",
    run: runCreateLocalOwnerScript,
  },
];

async function main(): Promise<void> {
  /*
   * Runs scripts in order because auth tables should exist before app users.
   */
  for (const script of databaseScripts) {
    /*
     * Setup scripts run sequentially because later scripts may depend on tables
     * created by earlier scripts.
     */
    console.log(`Running database script: ${script.name}`);
    await script.run();
  }

  console.log("All database scripts finished.");
}

main().catch((error: unknown) => {
  /* Terminal-friendly failure reporting. */
  console.error(error);
  process.exit(1);
});

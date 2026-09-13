import { runBetterAuthMigrationsScript } from "./auth/run-better-auth-migrations/run-better-auth-migrations";
import { runProjectMigrationsScript } from "./run-project-migrations/run-project-migrations";
import { runCreateOwnerScript } from "./users/create-owner/create-owner";

/** Run database setup scripts in dependency order. */
const databaseScripts = [
  {
    name: "run-project-migrations",
    run: runProjectMigrationsScript,
  },
  {
    name: "auth/run-better-auth-migrations",
    run: runBetterAuthMigrationsScript,
  },
  {
    name: "users/create-owner",
    run: runCreateOwnerScript,
  },
];

async function main(): Promise<void> {
  for (const script of databaseScripts) {
    console.log(`Running database script: ${script.name}`);
    await script.run();
  }

  console.log("All database scripts finished.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

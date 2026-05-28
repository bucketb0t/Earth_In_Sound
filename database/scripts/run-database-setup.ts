import { runCreateLocalOwnerScript } from "./users/create-local-owner/create-local-owner";

/**
 * Database setup script hub.
 */
const databaseScripts = [
  {
    name: "users/create-local-owner",
    run: runCreateLocalOwnerScript,
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

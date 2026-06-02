import { runUserDatabaseTests } from "./users/test-users/test-user-database";

/**
 * Database test suite hub.
 * Add future database feature tests here so one command checks all modules.
 *
 * This mirrors run-database-setup.ts: individual test suites stay close to the
 * feature they test, while this file gives you one command for the whole
 * database.
 */
const databaseTestSuites = [
  {
    name: "users/integration",
    run: runUserDatabaseTests,
  },
];

async function main(): Promise<void> {
  /*
   * Run each suite sequentially so shared test data is easier to debug.
   */
  for (const testSuite of databaseTestSuites) {
    /*
     * Suites run one at a time so failures are easier to read and temporary
     * test rows are cleaned up before the next suite starts.
     */
    console.log(`Running database test suite: ${testSuite.name}`);
    await testSuite.run();
  }

  console.log("All database test suites passed.");
}

main().catch((error: unknown) => {
  /* Terminal-friendly failure reporting. */
  console.error(error);
  process.exit(1);
});

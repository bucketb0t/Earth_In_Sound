import { runUserDomainRuleTests } from "./users/test-users/test-user-domain-rules";
import { runStoredUserValidationTests } from "./users/test-users/test-stored-user-validation";
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
    name: "users/domain-rules",
    run: runUserDomainRuleTests,
  },
  {
    name: "users/validation",
    run: runStoredUserValidationTests,
  },
  {
    name: "users/integration",
    run: runUserDatabaseTests,
  },
];

async function main(): Promise<void> {
  /*
   * Suites run one at a time so failures are easier to read and temporary
   * test rows are cleaned up before the next suite starts.
   */
  for (const testSuite of databaseTestSuites) {
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

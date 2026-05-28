import { runUserDatabaseTests } from "./users/test-users/test-user-database";

/**
 * Database test suite hub.
 */
const databaseTestSuites = [
  {
    name: "users/integration",
    run: runUserDatabaseTests,
  },
];

async function main(): Promise<void> {
  for (const testSuite of databaseTestSuites) {
    console.log(`Running database test suite: ${testSuite.name}`);
    await testSuite.run();
  }

  console.log("All database test suites passed.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

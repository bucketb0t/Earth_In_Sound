import { runUserDomainRuleTests } from "./users/test-users/test-user-domain-rules";
import { runStoredUserValidationTests } from "./users/test-users/test-stored-user-validation";
import { runUserDatabaseTests } from "./users/test-users/test-user-database";

/** Run database suites sequentially for isolated cleanup and readable failures. */
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

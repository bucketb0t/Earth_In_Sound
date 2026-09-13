import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { loadEnvConfig } from "@next/env";
import type { UserDatabaseTestContext } from "./test-user-context";
import {
  testAccountDeletion,
  testDisableFailureSafety,
  testDisableAndReactivate,
  testProjectDeletionFailureSafety,
  testUnlinkedProfileDeletion,
} from "./test-user-lifecycle";
import { testOwnerSetup } from "./test-owner-setup";
import { testUserReads } from "./test-user-reads";
import { testRolesAndOwnershipTransfer } from "./test-user-roles";
import {
  testFailedSignupRecovery,
  testNormalSignupAndProfile,
} from "./test-user-signup";

loadEnvConfig(process.cwd());

/**
 * Runs user/auth integration scenarios in one disposable local database.
 * Runtime database modules are loaded only after the test environment points
 * them at that database, preventing accidental access to configured data.
 */
export async function runUserDatabaseTests(): Promise<void> {
  const testDirectory = await mkdtemp(join(tmpdir(), "earth-in-sound-"));
  const databasePath = join(testDirectory, "test.db").replaceAll("\\", "/");

  process.env.TURSO_DATABASE_URL = `file:${databasePath}`;
  process.env.TURSO_AUTH_TOKEN = "local-test-token";
  process.env.BETTER_AUTH_SECRET =
    "earth-in-sound-test-secret-at-least-thirty-two-characters";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.EIS_SILENCE_BETTER_AUTH_LOGS = "true";

  let closeConnections: (() => Promise<void>) | null = null;

  try {
    const [{ runProjectMigrationsScript }, { runBetterAuthMigrationsScript }] =
      await Promise.all([
        import("../../run-project-migrations/run-project-migrations"),
        import("../../auth/run-better-auth-migrations/run-better-auth-migrations"),
      ]);

    await runProjectMigrationsScript();
    await runProjectMigrationsScript();
    await runBetterAuthMigrationsScript();

    const [
      { auth },
      { betterAuthDatabase },
      { runWithOwnerSetupContext },
      { turso },
      userReads,
      userWrites,
    ] = await Promise.all([
      import("../../../../authentication/auth"),
      import("../../../../authentication/better-auth-database"),
      import("../../../../authentication/owner-setup-context"),
      import("../../../turso-client"),
      import("../../../users/read/read-users"),
      import("../../../users/write/write-users"),
    ]);

    closeConnections = async () => {
      await betterAuthDatabase.destroy();
      turso.close();
    };

    const context: UserDatabaseTestContext = {
      auth,
      authContext: await auth.$context,
      runWithOwnerSetupContext,
      turso,
      userReads,
      userWrites,
      testRunId: randomUUID().slice(0, 8),
    };

    const owner = await testOwnerSetup(context);
    await testFailedSignupRecovery(context);
    const normalUser = await testNormalSignupAndProfile(context, owner);
    await testDisableFailureSafety(context, owner);
    await testDisableAndReactivate(context, owner, normalUser);
    await testUserReads(context, normalUser);
    const newOwner = await testRolesAndOwnershipTransfer(
      context,
      owner,
      normalUser,
    );
    await testProjectDeletionFailureSafety(context, newOwner);
    await testUnlinkedProfileDeletion(context, newOwner);
    await testAccountDeletion(context, newOwner);

    console.log("User and auth database tests passed.");
  } finally {
    await closeConnections?.();
    await rm(testDirectory, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runUserDatabaseTests().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

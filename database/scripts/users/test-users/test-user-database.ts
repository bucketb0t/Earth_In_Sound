import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { loadEnvConfig } from "@next/env";
import {
  assert,
  assertRejects,
  assertRejectsWithMessage,
} from "./test-user-helpers";

loadEnvConfig(process.cwd());

/**
 * Runs user/auth integration tests in a disposable local database.
 */
export async function runUserDatabaseTests(): Promise<void> {
  const testDirectory = await mkdtemp(join(tmpdir(), "earth-in-sound-"));
  const databasePath = join(testDirectory, "test.db").replaceAll("\\", "/");

  process.env.TURSO_DATABASE_URL = `file:${databasePath}`;
  process.env.TURSO_AUTH_TOKEN = "local-test-token";
  process.env.BETTER_AUTH_SECRET =
    "earth-in-sound-test-secret-at-least-thirty-two-characters";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";

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
      import("../../../../lib/server/auth/auth"),
      import("../../../../lib/server/auth/better-auth-database"),
      import("../../../../lib/server/auth/owner-setup-context"),
      import("../../../../lib/server/database/turso-client"),
      import("../../../../lib/server/database/users/read/read-users"),
      import("../../../../lib/server/database/users/write/write-users"),
    ]);

    closeConnections = async () => {
      await betterAuthDatabase.destroy();
      turso.close();
    };

    const testRunId = randomUUID().slice(0, 8);
    const ownerEmail = `${testRunId}-owner@example.com`;
    const ownerUsername = `${testRunId}-owner`;
    const ownerPassword = "Owner-test-password-123";
    const now = Date.now();

    /*
     * Reproduce the original broken state: a project owner with no Better Auth
     * account. Public signup must not be able to claim it.
     */
    await turso.execute({
      sql: `
        INSERT INTO users (
          id,
          auth_provider_user_id,
          email,
          email_lookup,
          username,
          username_lookup,
          role,
          status,
          created_at,
          updated_at
        )
        VALUES (?, NULL, ?, ?, ?, ?, 'owner', 'active', ?, ?)
      `,
      args: [
        `${testRunId}-owner-profile`,
        ownerEmail,
        ownerEmail.toLowerCase(),
        ownerUsername,
        ownerUsername.toLowerCase(),
        now,
        now,
      ],
    });

    await assertRejects(
      () =>
        auth.api.signUpEmail({
          body: {
            email: ownerEmail,
            name: ownerUsername,
            password: ownerPassword,
          },
        }),
      "public signup should not claim an unlinked owner profile",
    );

    const ownerSignup = await runWithOwnerSetupContext(
      { email: ownerEmail, username: ownerUsername },
      () =>
        auth.api.signUpEmail({
          body: {
            email: ownerEmail,
            name: ownerUsername,
            password: ownerPassword,
          },
        }),
    );

    const owner = await userReads.getOwner();
    assert(owner !== null, "owner setup should preserve the owner profile");
    assert(
      owner?.auth_provider_user_id === ownerSignup.user.id,
      "owner setup should link the Better Auth user id",
    );

    const authContext = await auth.$context;
    await authContext.internalAdapter.deleteUserSessions(ownerSignup.user.id);
    await auth.api.signInEmail({
      body: { email: ownerEmail, password: ownerPassword },
    });
    assert(
      (await authContext.internalAdapter.listSessions(ownerSignup.user.id))
        .length > 0,
      "linked owner should be able to authenticate",
    );

    /*
     * Normal signup must mirror a linked active project user with role=user.
     */
    const userEmail = `${testRunId}-user@example.com`;
    const userUsername = `${testRunId}-user`;
    const userPassword = "User-test-password-123";
    const userSignup = await auth.api.signUpEmail({
      body: {
        email: userEmail,
        name: userUsername,
        password: userPassword,
      },
    });
    const projectUser = await userReads.getUserByAuthProviderId(
      userSignup.user.id,
    );

    assert(projectUser !== null, "signup should create a project profile");
    assert(projectUser?.role === "user", "public signup should create role=user");
    assert(
      projectUser?.status === "active",
      "public signup should create an active profile",
    );

    const renamedUsername = `${testRunId}-renamed`;
    const renamedUser = await userWrites.updateUsername({
      currentUserId: projectUser!.id,
      username: renamedUsername,
    });
    assert(
      renamedUser.username === renamedUsername,
      "active users should be able to change their username",
    );
    await assertRejectsWithMessage(
      () =>
        userWrites.updateUsername({
          currentUserId: projectUser!.id,
          username: ownerUsername,
        }),
      "Username is already registered.",
      "existing usernames should remain reserved",
    );
    assert(
      (
        await userReads.searchUsers({
          searchText: renamedUsername,
        })
      ).some((user) => user.id === projectUser!.id),
      "search should find a user by partial username",
    );
    await assertRejectsWithMessage(
      () =>
        userWrites.disableUser({
          currentUserId: owner!.id,
          targetUserId: owner!.id,
        }),
      "Transfer ownership before disabling the owner account.",
      "the owner should not be able to disable themselves",
    );

    /*
     * Disabling revokes existing sessions and blocks future sign-in sessions.
     */
    await userWrites.disableUser({
      currentUserId: owner!.id,
      targetUserId: projectUser!.id,
    });
    assert(
      (await authContext.internalAdapter.listSessions(userSignup.user.id))
        .length === 0,
      "disabling should revoke all Better Auth sessions",
    );
    await assertRejects(
      () =>
        auth.api.signInEmail({
          body: { email: userEmail, password: userPassword },
        }),
      "disabled users should not create new sessions",
    );
    await assertRejectsWithMessage(
      () =>
        userWrites.updateUsername({
          currentUserId: projectUser!.id,
          username: `${testRunId}-disabled-rename`,
        }),
      "User account is not active.",
      "disabled users should not be able to change username",
    );
    await assertRejects(
      () =>
        auth.api.signUpEmail({
          body: {
            email: userEmail,
            name: `${testRunId}-duplicate-email`,
            password: userPassword,
          },
        }),
      "disabled account email should remain reserved",
    );

    await userWrites.reactivateUser({
      currentUserId: owner!.id,
      targetUserId: projectUser!.id,
    });
    await auth.api.signInEmail({
      body: { email: userEmail, password: userPassword },
    });

    /*
     * Role changes and ownership transfer keep exactly one owner.
     */
    const promotedUser = await userWrites.setUserRole({
      currentOwnerId: owner!.id,
      targetUserId: projectUser!.id,
      targetRole: "admin",
    });
    assert(promotedUser.role === "admin", "owner should be able to assign admin");

    const managedSignup = await auth.api.signUpEmail({
      body: {
        email: `${testRunId}-managed@example.com`,
        name: `${testRunId}-managed`,
        password: "Managed-test-password-123",
      },
    });
    const managedUser = await userReads.getUserByAuthProviderId(
      managedSignup.user.id,
    );
    const disabledByAdmin = await userWrites.disableUser({
      currentUserId: projectUser!.id,
      targetUserId: managedUser!.id,
    });
    assert(
      disabledByAdmin.status === "disabled",
      "admins should be able to disable normal users",
    );
    await userWrites.reactivateUser({
      currentUserId: owner!.id,
      targetUserId: managedUser!.id,
    });

    const newOwner = await userWrites.transferOwnership({
      currentOwnerId: owner!.id,
      targetUserId: projectUser!.id,
    });
    assert(newOwner.role === "owner", "ownership should transfer to target user");
    assert(
      (await userReads.getUserById(owner!.id))?.role === "admin",
      "previous owner should become admin",
    );

    await assertRejects(
      () =>
        turso.execute({
          sql: `
            INSERT INTO users (
              id,
              email,
              email_lookup,
              username,
              username_lookup,
              role,
              status,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, 'owner', 'active', ?, ?)
          `,
          args: [
            `${testRunId}-second-owner`,
            `${testRunId}-second-owner@example.com`,
            `${testRunId}-second-owner@example.com`,
            `${testRunId}-second-owner`,
            `${testRunId}-second-owner`,
            now,
            now,
          ],
        }),
      "database should reject a second owner",
    );

    /*
     * Full deletion removes Better Auth state, releases the private login
     * email, and permanently reserves the public username.
     */
    const deleteEmail = `${testRunId}-delete@example.com`;
    const deleteUsername = `${testRunId}-delete`;
    const deletePassword = "Delete-test-password-123";
    const deleteSignup = await auth.api.signUpEmail({
      body: {
        email: deleteEmail,
        name: deleteUsername,
        password: deletePassword,
      },
    });
    const deleteTarget = await userReads.getUserByAuthProviderId(
      deleteSignup.user.id,
    );

    const deletedUser = await userWrites.deleteUser({
      currentUserId: newOwner.id,
      targetUserId: deleteTarget!.id,
    });
    assert(deletedUser.status === "deleted", "delete should soft-delete profile");
    assert(
      deletedUser.auth_provider_user_id === null,
      "delete should release the auth provider id",
    );
    assert(
      deletedUser.email_lookup !== deleteEmail.toLowerCase(),
      "delete should release the email lookup",
    );
    assert(
      deletedUser.username_lookup === deleteUsername.toLowerCase(),
      "delete should keep the username lookup reserved",
    );
    assert(
      (await authContext.internalAdapter.findUserById(deleteSignup.user.id)) ===
        null,
      "delete should remove the Better Auth user",
    );
    await assertRejectsWithMessage(
      () =>
        userWrites.reactivateUser({
          currentUserId: newOwner.id,
          targetUserId: deleteTarget!.id,
        }),
      "Only disabled users can be reactivated.",
      "deleted users should not reactivate through the normal flow",
    );

    await assertRejects(
      () =>
        auth.api.signUpEmail({
          body: {
            email: deleteEmail,
            name: deleteUsername,
            password: deletePassword,
          },
        }),
      "deleted username should remain permanently reserved",
    );

    const reusedEmailSignup = await auth.api.signUpEmail({
      body: {
        email: deleteEmail,
        name: `${deleteUsername}-new`,
        password: deletePassword,
      },
    });
    assert(
      reusedEmailSignup.user.id !== deleteSignup.user.id,
      "deleted email should be reusable with a different username",
    );

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

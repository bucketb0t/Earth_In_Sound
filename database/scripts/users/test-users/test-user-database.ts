import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

import { loadEnvConfig } from "@next/env";
import {
  assert,
  assertRejectsWithMessage,
  deleteTestUsers,
  seedTestUsers,
  type TestUserSeed,
} from "./test-user-helpers";

/**
 * Environment loader for database scripts.
 */
loadEnvConfig(process.cwd());

export async function runUserDatabaseTests(): Promise<void> {
  /**
   * Database module imports that depend on environment variables.
   */
  const { turso } = await import("../../../../lib/server/database/turso-client");
  const {
    getUserByEmail,
    getUserById,
    searchUsers,
  } = await import("../../../../lib/server/database/users/read/read-users");
  const {
    deleteUser,
    disableUser,
    reactivateUser,
    updateUsername,
  } = await import("../../../../lib/server/database/users/write/write-users");

  /**
   * Unique namespace for all rows created by this test run.
   */
  const testRunId = randomUUID().slice(0, 8);
  const testPrefix = `t-${testRunId}`;
  const now = Date.now();

  /**
   * Temporary users used by the script.
   * They are inserted directly so the test can focus on exported functions.
   */
  const testUsers: TestUserSeed[] = [
    {
      id: `${testPrefix}-owner`,
      email: `${testPrefix}-owner@example.com`,
      username: `${testPrefix}-owner`,
      role: "owner",
      status: "active",
    },
    {
      id: `${testPrefix}-admin`,
      email: `${testPrefix}-admin@example.com`,
      username: `${testPrefix}-admin`,
      role: "admin",
      status: "active",
    },
    {
      id: `${testPrefix}-active-user`,
      email: `${testPrefix}-active-user@example.com`,
      username: `${testPrefix}-active-user`,
      role: "user",
      status: "active",
    },
    {
      id: `${testPrefix}-disabled-user`,
      email: `${testPrefix}-disabled-user@example.com`,
      username: `${testPrefix}-disabled-user`,
      role: "user",
      status: "disabled",
    },
    {
      id: `${testPrefix}-delete-target`,
      authProviderUserId: `${testPrefix}-auth-delete-target`,
      email: `${testPrefix}-delete-target@example.com`,
      username: `${testPrefix}-delete-target`,
      role: "user",
      status: "active",
    },
    {
      id: `${testPrefix}-reactivate-delete-target`,
      email: `${testPrefix}-reactivate-delete-target@example.com`,
      username: `${testPrefix}-reactivate-delete-target`,
      role: "user",
      status: "active",
    },
  ];

  try {
    await seedTestUsers(turso, testUsers, now);

    /**
     * Test row ids.
     * The names explain which rule each user is used to test.
     */
    const ownerId = `${testPrefix}-owner`;
    const adminId = `${testPrefix}-admin`;
    const activeUserId = `${testPrefix}-active-user`;
    const disabledUserId = `${testPrefix}-disabled-user`;
    const deleteTargetId = `${testPrefix}-delete-target`;
    const reactivateDeleteTargetId = `${testPrefix}-reactivate-delete-target`;

    /**
     * Active users should be able to change only their own username.
     */
    const updatedUser = await updateUsername({
      currentUserId: activeUserId,
      username: `${testPrefix}-renamed-user`,
    });
    assert(
      updatedUser.username === `${testPrefix}-renamed-user`,
      "active users should be able to change their own username",
    );

    /**
     * Disabled users cannot act, so username changes must be rejected.
     */
    await assertRejectsWithMessage(
      () =>
        updateUsername({
          currentUserId: disabledUserId,
          username: `${testPrefix}-disabled-rename`,
        }),
      "User account is not active.",
      "disabled users should not be able to change username",
    );

    /**
     * A username already owned by another row must stay reserved.
     */
    await assertRejectsWithMessage(
      () =>
        updateUsername({
          currentUserId: activeUserId,
          username: `${testPrefix}-admin`,
        }),
      "Username is already registered.",
      "existing usernames should stay reserved",
    );

    /**
     * Owner self-disable protection.
     */
    await assertRejectsWithMessage(
      () => disableUser({ currentUserId: ownerId, targetUserId: ownerId }),
      "Transfer ownership before disabling the owner account.",
      "owner should not be able to disable self",
    );

    /**
     * Admins can disable normal users.
     */
    await disableUser({ currentUserId: adminId, targetUserId: activeUserId });
    const disabledActiveUser = await getUserById(activeUserId);
    assert(
      disabledActiveUser?.status === "disabled",
      "admin should be able to disable a normal user",
    );

    /**
     * Disabled accounts keep email_lookup reserved.
     * A direct insert with the same email_lookup should fail.
     */
    try {
      await turso.execute({
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
          VALUES (?, ?, ?, ?, ?, 'user', 'active', ?, ?)
        `,
        args: [
          `${testPrefix}-disabled-email-reuse`,
          `${testPrefix}-active-user@example.com`,
          `${testPrefix}-active-user@example.com`,
          `${testPrefix}-disabled-email-reuse`,
          `${testPrefix}-disabled-email-reuse`,
          now,
          now,
        ],
      });
      throw new Error("disabled account email was unexpectedly reusable");
    } catch {
      // Expected duplicate email_lookup rejection.
    }

    /**
     * Disabled account reactivation.
     */
    const reactivatedUser = await reactivateUser({
      currentUserId: adminId,
      targetUserId: activeUserId,
    });
    assert(
      reactivatedUser.status === "active",
      "disabled users should be reactivatable",
    );

    /**
     * Deleted accounts are soft-deleted.
     * The row remains, but status changes and auth uniqueness is released.
     */
    const deletedUser = await deleteUser({
      currentUserId: adminId,
      targetUserId: deleteTargetId,
    });
    assert(deletedUser.status === "deleted", "deleteUser should soft-delete");
    assert(
      deletedUser.auth_provider_user_id === null,
      "deleted users should release their auth provider id",
    );

    /**
     * Deleted accounts release email_lookup.
     * This insert proves the same email can be used by a new account row.
     */
    await turso.execute({
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
        VALUES (?, ?, ?, ?, ?, 'user', 'active', ?, ?)
      `,
      args: [
        `${testPrefix}-email-reuse`,
        `${testPrefix}-delete-target@example.com`,
        `${testPrefix}-delete-target@example.com`,
        `${testPrefix}-email-reuse`,
        `${testPrefix}-email-reuse`,
        now,
        now,
      ],
    });

    const reusedEmailUser = await getUserByEmail(
      `${testPrefix}-delete-target@example.com`,
    );
    assert(
      reusedEmailUser?.id === `${testPrefix}-email-reuse`,
      "deleted account email should be reusable by a new row",
    );

    /**
     * Deleted accounts cannot be reactivated through the normal flow.
     */
    await deleteUser({
      currentUserId: ownerId,
      targetUserId: reactivateDeleteTargetId,
    });
    await assertRejectsWithMessage(
      () =>
        reactivateUser({
          currentUserId: ownerId,
          targetUserId: reactivateDeleteTargetId,
        }),
      "Only disabled users can be reactivated.",
      "deleted users should not reactivate through normal flow",
    );

    /**
     * Search should find users by partial username/email lookup text.
     */
    const searchResults = await searchUsers({
      searchText: `${testPrefix}-renamed`,
    });
    assert(
      searchResults.some((user) => user.id === activeUserId),
      "searchUsers should find users by partial username",
    );

    console.log("User database tests passed.");
  } finally {
    await deleteTestUsers(turso, testPrefix);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runUserDatabaseTests().catch((error: unknown) => {
    // Script failure reporting.
    console.error(error);
    process.exit(1);
  });
}

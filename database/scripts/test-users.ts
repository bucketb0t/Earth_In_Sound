import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";

/**
 * Load .env.local before importing database modules.
 * turso.ts reads process.env immediately when it is imported.
 */
loadEnvConfig(process.cwd());

type TestUserSeed = {
  // The test writes fixed ids so each later check can target a known user.
  id: string;
  // Optional fake auth id; used to verify deleteUser releases auth uniqueness.
  authProviderUserId?: string | null;
  // Visible account values. The database also stores lowercase lookup versions.
  email: string;
  username: string;
  // Role/status combinations let the test cover owner, admin, active, disabled.
  role: "owner" | "admin" | "user";
  status: "active" | "disabled" | "deleted";
};

/**
 * Tiny test assertion helper.
 * If a condition is false, the script stops with a clear failure message.
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Test failed: ${message}`);
  }
}

async function main(): Promise<void> {
  /**
   * Import database code after .env.local is loaded.
   * Dynamic import keeps the order explicit for scripts.
   */
  const { turso } = await import("../../lib/database/turso");
  const {
    deleteUser,
    disableUser,
    getUserByEmail,
    getUserById,
    reactivateUser,
    searchUsers,
    updateUsername,
  } = await import("../../lib/database/users");

  /**
   * Every test run gets a short unique prefix.
   * This prevents collisions with real users or previous failed test runs.
   */
  const testRunId = randomUUID().slice(0, 8);
  const testPrefix = `t-${testRunId}`;
  const now = Date.now();

  /**
   * Temporary users used by the script.
   * They are inserted directly so the test can focus on the exported functions.
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
    /**
     * Seed isolated rows directly.
     * The tests below then exercise the real exported database functions.
     */
    for (const user of testUsers) {
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
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          user.id,
          user.authProviderUserId ?? null,
          user.email,
          user.email.toLowerCase(),
          user.username,
          user.username.toLowerCase(),
          user.role,
          user.status,
          now,
          now,
        ],
      });
    }

    /**
     * Store the temporary ids in readable variables.
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
    try {
      await updateUsername({
        currentUserId: disabledUserId,
        username: `${testPrefix}-disabled-rename`,
      });
      throw new Error("disabled user unexpectedly changed username");
    } catch (error) {
      assert(
        error instanceof Error &&
          error.message === "User account is not active.",
        "disabled users should not be able to change username",
      );
    }

    /**
     * A username already owned by another row must stay reserved.
     */
    try {
      await updateUsername({
        currentUserId: activeUserId,
        username: `${testPrefix}-admin`,
      });
      throw new Error("duplicate username was unexpectedly accepted");
    } catch (error) {
      assert(
        error instanceof Error &&
          error.message === "Username is already registered.",
        "existing usernames should stay reserved",
      );
    }

    /**
     * The owner account is protected from self-disable.
     * Ownership should be transferred before the owner account is closed.
     */
    try {
      await disableUser({ currentUserId: ownerId, targetUserId: ownerId });
      throw new Error("owner unexpectedly disabled self");
    } catch (error) {
      assert(
        error instanceof Error &&
          error.message ===
            "Transfer ownership before disabling the owner account.",
        "owner should not be able to disable self",
      );
    }

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
      // Disabled accounts keep their email_lookup reserved.
    }

    /**
     * Disabled accounts are the only accounts that can be restored normally.
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

    try {
      await reactivateUser({
        currentUserId: ownerId,
        targetUserId: reactivateDeleteTargetId,
      });
      throw new Error("deleted user unexpectedly reactivated");
    } catch (error) {
      assert(
        error instanceof Error &&
          error.message === "Only disabled users can be reactivated.",
        "deleted users should not reactivate through normal flow",
      );
    }

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
    /**
     * Clean up all temporary rows, including rows created during reuse checks.
     * This physical deletion is only for test data created by this script.
     */
    await turso.execute({
      sql: "DELETE FROM users WHERE id LIKE ?",
      args: [`${testPrefix}%`],
    });
  }
}

main().catch((error: unknown) => {
  // Report script failures and return a non-zero exit code for the terminal.
  console.error(error);
  process.exit(1);
});

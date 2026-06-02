import type { Client } from "@libsql/client";

export type TestUserSeed = {
  // Test row id.
  id: string;
  // Optional auth provider id.
  authProviderUserId?: string | null;
  // Visible account values.
  email: string;
  username: string;
  // Account permissions and lifecycle state.
  role: "owner" | "admin" | "user";
  status: "active" | "disabled" | "deleted";
};

/**
 * Tiny assertion helper for script-based tests.
 *
 * Throws a normal Error so these scripts can run with plain tsx instead of a
 * full test runner.
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Test failed: ${message}`);
  }
}

/**
 * Runs an action that should fail and verifies the exact error message.
 *
 * This is useful for permission/validation tests, where success means "the
 * dangerous action was rejected for the reason we expected."
 */
export async function assertRejectsWithMessage(
  action: () => Promise<unknown>,
  expectedMessage: string,
  failureMessage: string,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    assert(
      error instanceof Error && error.message === expectedMessage,
      failureMessage,
    );
    return;
  }

  throw new Error(`Test failed: ${failureMessage}`);
}

/**
 * Inserts seeded user rows for tests.
 *
 * The tests bypass signup here because they need exact role/status setups such
 * as owner, admin, disabled user, and delete target.
 */
export async function seedTestUsers(
  turso: Client,
  users: TestUserSeed[],
  createdAt: number,
): Promise<void> {
  /*
   * Tests seed exact rows so each rule can target a known role/status.
   */
  for (const user of users) {
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
        createdAt,
        createdAt,
      ],
    });
  }
}

/**
 * Removes seeded user rows created by a test run.
 *
 * Cleanup keeps the real Turso database usable after repeated local tests.
 */
export async function deleteTestUsers(
  turso: Client,
  testPrefix: string,
): Promise<void> {
  /*
   * Every seeded id begins with the run prefix, so cleanup is deterministic.
   */
  await turso.execute({
    sql: "DELETE FROM users WHERE id LIKE ?",
    args: [`${testPrefix}%`],
  });
}

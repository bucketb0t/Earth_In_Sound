import type { StoredUser } from "../../../users/read/read-users";
import type {
  NormalUserTestResult,
  UserDatabaseTestContext,
} from "./test-user-context";
import {
  assert,
  assertRejects,
  assertRejectsWithMessage,
} from "./test-user-helpers";

/**
 * Verifies role assignment, admin management, ownership transfer, and the
 * database-level guarantee that only one owner can exist.
 */
export async function testRolesAndOwnershipTransfer(
  context: UserDatabaseTestContext,
  owner: StoredUser,
  normalUser: NormalUserTestResult,
): Promise<StoredUser> {
  const { auth, turso, userReads, userWrites, testRunId } = context;

  await assertRejectsWithMessage(
    () =>
      userWrites.setUserRole({
        currentOwnerId: normalUser.user.id,
        targetUserId: owner.id,
        targetRole: "user",
      }),
    "Only the owner can change user roles.",
    "normal users should not change roles",
  );
  await assertRejectsWithMessage(
    () =>
      userWrites.transferOwnership({
        currentOwnerId: normalUser.user.id,
        targetUserId: owner.id,
      }),
    "Only the owner can transfer ownership.",
    "normal users should not transfer ownership",
  );
  await assertRejectsWithMessage(
    () =>
      userWrites.setUserRole({
        currentOwnerId: owner.id,
        targetUserId: owner.id,
        targetRole: "admin",
      }),
    "Use ownership transfer to change the owner.",
    "the owner role should not change through ordinary role assignment",
  );
  await assertRejectsWithMessage(
    () =>
      userWrites.transferOwnership({
        currentOwnerId: owner.id,
        targetUserId: owner.id,
      }),
    "Ownership is already assigned to this user.",
    "ownership should not transfer to the existing owner",
  );

  const promotedUser = await userWrites.setUserRole({
    currentOwnerId: owner.id,
    targetUserId: normalUser.user.id,
    targetRole: "admin",
  });
  assert(
    promotedUser.role === "admin",
    "owner should be able to assign admin",
  );
  const unchangedAdmin = await userWrites.setUserRole({
    currentOwnerId: owner.id,
    targetUserId: normalUser.user.id,
    targetRole: "admin",
  });
  assert(
    unchangedAdmin.updated_at === promotedUser.updated_at,
    "assigning an existing role should not rewrite the user",
  );
  await assertRejectsWithMessage(
    () =>
      userWrites.disableUser({
        currentUserId: normalUser.user.id,
        targetUserId: owner.id,
      }),
    "You do not have permission to manage this user.",
    "admins should not manage the owner",
  );

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
  assert(managedUser !== null, "managed signup should create a project user");

  const disabledByAdmin = await userWrites.disableUser({
    currentUserId: normalUser.user.id,
    targetUserId: managedUser.id,
  });
  assert(
    disabledByAdmin.status === "disabled",
    "admins should be able to disable normal users",
  );
  await assertRejectsWithMessage(
    () =>
      userWrites.transferOwnership({
        currentOwnerId: owner.id,
        targetUserId: managedUser.id,
      }),
    "User account is not active.",
    "ownership should not transfer to a disabled user",
  );
  await assertRejectsWithMessage(
    () =>
      userWrites.setUserRole({
        currentOwnerId: owner.id,
        targetUserId: managedUser.id,
        targetRole: "admin",
      }),
    "User account is not active.",
    "disabled users should not receive new roles",
  );
  await userWrites.reactivateUser({
    currentUserId: owner.id,
    targetUserId: managedUser.id,
  });

  /*
   * Fail the second statement in ownership transfer. The transaction must
   * restore the first statement so the current owner never disappears.
   */
  await turso.execute({
    sql: `
      CREATE TRIGGER reject_owner_transfer_for_test
      BEFORE UPDATE OF role ON users
      WHEN NEW.role = 'owner'
      BEGIN
        SELECT RAISE(ABORT, 'forced ownership transfer failure');
      END
    `,
    args: [],
  });

  try {
    await assertRejects(
      () =>
        userWrites.transferOwnership({
          currentOwnerId: owner.id,
          targetUserId: normalUser.user.id,
        }),
      "ownership transfer should fail when the new owner cannot be written",
    );
  } finally {
    await turso.execute({
      sql: "DROP TRIGGER reject_owner_transfer_for_test",
      args: [],
    });
  }

  assert(
    (await userReads.getUserById(owner.id))?.role === "owner",
    "failed ownership transfer should preserve the current owner",
  );
  assert(
    (await userReads.getUserById(normalUser.user.id))?.role === "admin",
    "failed ownership transfer should preserve the target role",
  );

  const newOwner = await userWrites.transferOwnership({
    currentOwnerId: owner.id,
    targetUserId: normalUser.user.id,
  });
  assert(
    newOwner.role === "owner",
    "ownership should transfer to target user",
  );
  assert(
    (await userReads.getUserById(owner.id))?.role === "admin",
    "previous owner should become admin",
  );
  await assertRejectsWithMessage(
    () =>
      userWrites.setUserRole({
        currentOwnerId: owner.id,
        targetUserId: managedUser.id,
        targetRole: "admin",
      }),
    "Only the owner can change user roles.",
    "the previous owner should lose owner-only permissions",
  );

  const now = Date.now();
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

  return newOwner;
}

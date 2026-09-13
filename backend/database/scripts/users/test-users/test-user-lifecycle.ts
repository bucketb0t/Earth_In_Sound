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

/** Test disable rollback: failed profile updates preserve active sessions. */
export async function testDisableFailureSafety(
  context: UserDatabaseTestContext,
  owner: StoredUser,
): Promise<void> {
  const { auth, authContext, turso, userReads, userWrites, testRunId } =
    context;
  const email = `${testRunId}-failed-disable@example.com`;
  const signup = await auth.api.signUpEmail({
    body: {
      email,
      name: `${testRunId}-failed-disable`,
      password: "Failed-disable-password-123",
    },
  });
  const disableTarget = await userReads.getUserByAuthProviderId(signup.user.id);
  assert(
    disableTarget !== null,
    "failed-disable signup should create a project user",
  );

  const originalSessionCount = (
    await authContext.internalAdapter.listSessions(signup.user.id)
  ).length;
  assert(
    originalSessionCount > 0,
    "failed-disable test signup should begin with an auth session",
  );

  await turso.execute({
    sql: `
      CREATE TRIGGER reject_project_profile_disable_for_test
      BEFORE UPDATE OF status ON users
      WHEN NEW.status = 'disabled'
      BEGIN
        SELECT RAISE(ABORT, 'forced project disable failure');
      END
    `,
    args: [],
  });

  try {
    await assertRejects(
      () =>
        userWrites.disableUser({
          currentUserId: owner.id,
          targetUserId: disableTarget.id,
        }),
      "disable should fail when the project status cannot be updated",
    );
  } finally {
    await turso.execute({
      sql: "DROP TRIGGER reject_project_profile_disable_for_test",
      args: [],
    });
  }

  const unchangedUser = await userReads.getUserById(disableTarget.id);
  assert(
    unchangedUser?.status === "active",
    "failed disable should leave the project user active",
  );
  assert(
    (await authContext.internalAdapter.listSessions(signup.user.id)).length ===
      originalSessionCount,
    "failed disable should preserve existing sessions",
  );

  await userWrites.deleteUser({
    currentUserId: owner.id,
    targetUserId: disableTarget.id,
  });
}

/** Test disabling, session revocation, identity reservation, and reactivation. */
export async function testDisableAndReactivate(
  context: UserDatabaseTestContext,
  owner: StoredUser,
  normalUser: NormalUserTestResult,
): Promise<void> {
  const { auth, authContext, userWrites, testRunId } = context;

  await userWrites.disableUser({
    currentUserId: owner.id,
    targetUserId: normalUser.user.id,
  });
  assert(
    (await authContext.internalAdapter.listSessions(normalUser.authUserId))
      .length === 0,
    "disabling should revoke all Better Auth sessions",
  );
  await assertRejects(
    () =>
      auth.api.signInEmail({
        body: { email: normalUser.email, password: normalUser.password },
    }),
    "disabled users should not create new sessions",
  );
  assert(
    (await authContext.internalAdapter.listSessions(normalUser.authUserId))
      .length === 0,
    "a rejected disabled-user sign-in should not leave a session",
  );
  await assertRejectsWithMessage(
    () =>
      userWrites.updateUsername({
        currentUserId: normalUser.user.id,
        username: `${testRunId}-disabled-rename`,
      }),
    "User account is not active.",
    "disabled users should not be able to change username",
  );
  await assertRejects(
    () =>
      auth.api.signUpEmail({
        body: {
          email: normalUser.email,
          name: `${testRunId}-duplicate-email`,
          password: normalUser.password,
        },
      }),
    "disabled account email should remain reserved",
  );

  await userWrites.reactivateUser({
    currentUserId: owner.id,
    targetUserId: normalUser.user.id,
  });
  await auth.api.signInEmail({
    body: { email: normalUser.email, password: normalUser.password },
  });
  assert(
    (await authContext.internalAdapter.listSessions(normalUser.authUserId))
      .length > 0,
    "a reactivated user should be able to create a new session",
  );
}

/** Test deletion rollback: failed profile updates preserve auth records. */
export async function testProjectDeletionFailureSafety(
  context: UserDatabaseTestContext,
  currentOwner: StoredUser,
): Promise<void> {
  const { auth, authContext, turso, userReads, userWrites, testRunId } =
    context;
  const email = `${testRunId}-failed-delete@example.com`;
  const username = `${testRunId}-failed-delete`;
  const password = "Failed-delete-password-123";

  const signup = await auth.api.signUpEmail({
    body: { email, name: username, password },
  });

  const deleteTarget = await userReads.getUserByAuthProviderId(signup.user.id);

  assert(
    deleteTarget !== null,
    "failed-deletion signup should create a project user",
  );
  const originalSessions = await authContext.internalAdapter.listSessions(
    signup.user.id,
  );
  assert(
    originalSessions.length > 0,
    "failed-deletion test signup should begin with an auth session",
  );
  assert(
    (await authContext.internalAdapter.findCredentialAccount(signup.user.id)) !==
      null,
    "failed-deletion test signup should begin with login credentials",
  );

  /* Force the profile deletion update to fail. */
  await turso.execute({
    sql: `
      CREATE TRIGGER reject_project_profile_delete_for_test
      BEFORE UPDATE OF status ON users
      WHEN NEW.status = 'deleted'
      BEGIN
        SELECT RAISE(ABORT, 'forced project deletion failure');
      END
    `,
    args: [],
  });

  try {
    await assertRejects(
      () =>
        userWrites.deleteUser({
          currentUserId: currentOwner.id,
          targetUserId: deleteTarget.id,
        }),
      "account deletion should fail when the project profile cannot be updated",
    );
  } finally {
    await turso.execute({
      sql: "DROP TRIGGER reject_project_profile_delete_for_test",
      args: [],
    });
  }

  const unchangedUser = await userReads.getUserById(deleteTarget.id);

  assert(
    unchangedUser?.status === "active",
    "failed deletion should leave the project user active",
  );
  assert(
    unchangedUser.auth_provider_user_id === signup.user.id,
    "failed deletion should preserve the authentication link",
  );
  assert(
    (await authContext.internalAdapter.findUserById(signup.user.id)) !== null,
    "failed deletion should keep the Better Auth user",
  );
  assert(
    (await authContext.internalAdapter.findCredentialAccount(signup.user.id)) !==
      null,
    "failed deletion should restore the credential account",
  );
  assert(
    (await authContext.internalAdapter.listSessions(signup.user.id)).length ===
      originalSessions.length,
    "failed deletion should restore existing sessions",
  );

  await userWrites.deleteUser({
    currentUserId: currentOwner.id,
    targetUserId: deleteTarget.id,
  });
}

/** Test soft deletion, auth cleanup, reserved usernames, and released emails. */
export async function testAccountDeletion(
  context: UserDatabaseTestContext,
  currentOwner: StoredUser,
): Promise<void> {
  const { auth, authContext, userReads, userWrites, testRunId } = context;

  await assertRejectsWithMessage(
    () =>
      userWrites.deleteUser({
        currentUserId: currentOwner.id,
        targetUserId: currentOwner.id,
      }),
    "Transfer ownership before deleting the owner account.",
    "the current owner should not be able to delete themselves",
  );

  const email = `${testRunId}-delete@example.com`;
  const username = `${testRunId}-delete`;
  const password = "Delete-test-password-123";
  const signup = await auth.api.signUpEmail({
    body: { email, name: username, password },
  });
  const deleteTarget = await userReads.getUserByAuthProviderId(signup.user.id);
  assert(deleteTarget !== null, "delete signup should create a project user");

  const deletedUser = await userWrites.deleteUser({
    currentUserId: deleteTarget.id,
    targetUserId: deleteTarget.id,
  });
  assert(deletedUser.status === "deleted", "delete should soft-delete profile");
  assert(
    deletedUser.auth_provider_user_id === null,
    "delete should release the auth provider id",
  );
  assert(
    deletedUser.email_lookup !== email.toLowerCase(),
    "delete should release the email lookup",
  );
  assert(
    deletedUser.username_lookup === username.toLowerCase(),
    "delete should keep the username lookup reserved",
  );
  assert(
    (await authContext.internalAdapter.findUserById(signup.user.id)) === null,
    "delete should remove the Better Auth user",
  );
  assert(
    (await authContext.internalAdapter.findCredentialAccount(signup.user.id)) ===
      null,
    "delete should remove the credential account",
  );
  assert(
    (await authContext.internalAdapter.listSessions(signup.user.id)).length ===
      0,
    "delete should remove every auth session",
  );
  await assertRejectsWithMessage(
    () =>
      userWrites.deleteUser({
        currentUserId: currentOwner.id,
        targetUserId: deleteTarget.id,
      }),
    "User is already deleted.",
    "an already deleted account should not be deleted again",
  );
  await assertRejectsWithMessage(
    () =>
      userWrites.disableUser({
        currentUserId: currentOwner.id,
        targetUserId: deleteTarget.id,
      }),
    "Deleted users cannot be disabled.",
    "a deleted account should not enter the disabled state",
  );
  await assertRejectsWithMessage(
    () =>
      userWrites.reactivateUser({
        currentUserId: currentOwner.id,
        targetUserId: deleteTarget.id,
      }),
    "Only disabled users can be reactivated.",
    "deleted users should not reactivate through the normal flow",
  );

  await assertRejects(
    () =>
      auth.api.signUpEmail({
        body: { email, name: username, password },
      }),
    "deleted username should remain permanently reserved",
  );

  const reusedEmailSignup = await auth.api.signUpEmail({
    body: {
      email,
      name: `${username}-new`,
      password,
    },
  });
  assert(
    reusedEmailSignup.user.id !== signup.user.id,
    "deleted email should be reusable with a different username",
  );
}

/** Test deletion of legacy profiles without linked auth records. */
export async function testUnlinkedProfileDeletion(
  context: UserDatabaseTestContext,
  currentOwner: StoredUser,
): Promise<void> {
  const { turso, userWrites, testRunId } = context;
  const userId = `${testRunId}-unlinked-delete`;
  const email = `${testRunId}-unlinked-delete@example.com`;
  const username = `${testRunId}-unlinked-delete`;
  const now = Date.now();

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
      VALUES (?, NULL, ?, ?, ?, ?, 'user', 'active', ?, ?)
    `,
    args: [userId, email, email, username, username, now, now],
  });

  const deletedUser = await userWrites.deleteUser({
    currentUserId: currentOwner.id,
    targetUserId: userId,
  });

  assert(
    deletedUser.status === "deleted" &&
      deletedUser.auth_provider_user_id === null,
    "an unlinked legacy profile should be soft-deleted without auth cleanup",
  );
  assert(
    deletedUser.email_lookup !== email,
    "an unlinked deleted profile should release its email lookup",
  );
}

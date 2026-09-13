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
 * Verifies that a failed project-profile write removes the incomplete auth
 * account and releases the identity for a later signup attempt.
 */
export async function testFailedSignupRecovery(
  context: UserDatabaseTestContext,
): Promise<void> {
  const { auth, authContext, turso, userReads, testRunId } = context;
  const failedMirrorEmail = `${testRunId}-failed-mirror@example.com`;
  const failedMirrorUsername = `${testRunId}-failed-mirror`;
  const failedMirrorPassword = "Failed-mirror-password-123";

  /*
   * This temporary trigger affects only the disposable test database and
   * forces the project profile insert to fail after Better Auth commits.
   */
  await turso.execute({
    sql: `
      CREATE TRIGGER reject_project_profile_insert_for_test
      BEFORE INSERT ON users
      BEGIN
        SELECT RAISE(ABORT, 'forced project profile failure');
      END
    `,
    args: [],
  });

  try {
    await assertRejects(
      () =>
        auth.api.signUpEmail({
          body: {
            email: failedMirrorEmail,
            name: failedMirrorUsername,
            password: failedMirrorPassword,
          },
        }),
      "signup should fail when project profile creation fails",
    );
  } finally {
    await turso.execute({
      sql: "DROP TRIGGER reject_project_profile_insert_for_test",
      args: [],
    });
  }

  assert(
    (await authContext.internalAdapter.findUserByEmail(failedMirrorEmail)) ===
      null,
    "failed project profile creation should remove the Better Auth user",
  );
  const retriedSignup = await auth.api.signUpEmail({
    body: {
      email: failedMirrorEmail,
      name: failedMirrorUsername,
      password: failedMirrorPassword,
    },
  });
  const retriedProjectUser = await userReads.getUserByAuthProviderId(
    retriedSignup.user.id,
  );

  assert(
    retriedProjectUser !== null,
    "a cleaned failed signup should be able to retry successfully",
  );
}

/**
 * Verifies ordinary signup, default role/status, username updates, uniqueness,
 * and search. The returned user is exercised by later lifecycle scenarios.
 */
export async function testNormalSignupAndProfile(
  context: UserDatabaseTestContext,
  owner: StoredUser,
): Promise<NormalUserTestResult> {
  const { auth, userReads, userWrites, testRunId } = context;
  const email = `${testRunId}-user@example.com`;
  const username = `${testRunId}-user`;
  const password = "User-test-password-123";
  const signup = await auth.api.signUpEmail({
    body: { email, name: username, password },
  });
  const projectUser = await userReads.getUserByAuthProviderId(signup.user.id);

  assert(projectUser !== null, "signup should create a project profile");
  assert(
    projectUser.role === "user",
    "public signup should create role=user",
  );
  assert(
    projectUser.status === "active",
    "public signup should create an active profile",
  );

  const repeatedProfileWrite =
    await userWrites.createNormalUserAfterSignup({
      authProviderUserId: signup.user.id,
      email: "ignored-repeat@example.com",
      username: "ignored-repeat",
    });
  assert(
    repeatedProfileWrite.id === projectUser.id,
    "repeated signup hooks should return the existing project profile",
  );

  await assertRejectsWithMessage(
    () =>
      userWrites.createNormalUserAfterSignup({
        authProviderUserId: "   ",
        email,
        username,
      }),
    "Auth provider user id is required.",
    "project profile creation should reject a blank auth id",
  );

  const renamedUsername = `${testRunId}-renamed`;
  const renamedUser = await userWrites.updateUsername({
    currentUserId: projectUser.id,
    username: renamedUsername,
  });
  assert(
    renamedUser.username === renamedUsername,
    "active users should be able to change their username",
  );

  await assertRejectsWithMessage(
    () =>
      userWrites.updateUsername({
        currentUserId: projectUser.id,
        username: owner.username.toUpperCase(),
      }),
    "Username is already registered.",
    "existing usernames should remain reserved",
  );
  assert(
    (
      await userReads.searchUsers({
        searchText: renamedUsername,
      })
    ).some((user) => user.id === projectUser.id),
    "search should find a user by partial username",
  );

  return {
    user: projectUser,
    authUserId: signup.user.id,
    email,
    password,
  };
}

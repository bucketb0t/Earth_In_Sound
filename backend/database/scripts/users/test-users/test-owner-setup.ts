import type { StoredUser } from "../../../users/read/read-users";
import type { UserDatabaseTestContext } from "./test-user-context";
import {
  assert,
  assertRejects,
  assertRejectsWithMessage,
} from "./test-user-helpers";

/** Test protected owner setup, auth linking, and self-management restrictions. */
export async function testOwnerSetup(
  context: UserDatabaseTestContext,
): Promise<StoredUser> {
  const {
    auth,
    authContext,
    runWithOwnerSetupContext,
    turso,
    userReads,
    userWrites,
    testRunId,
  } = context;
  const ownerEmail = `${testRunId}-owner@example.com`;
  const ownerUsername = `${testRunId}-owner`;
  const ownerPassword = "Owner-test-password-123";
  const now = Date.now();

  /* Public signup must not claim a legacy owner profile with no auth link. */
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
    owner.auth_provider_user_id === ownerSignup.user.id,
    "owner setup should link the Better Auth user id",
  );

  await authContext.internalAdapter.deleteUserSessions(ownerSignup.user.id);
  await auth.api.signInEmail({
    body: { email: ownerEmail, password: ownerPassword },
  });
  assert(
    (await authContext.internalAdapter.listSessions(ownerSignup.user.id))
      .length > 0,
    "linked owner should be able to authenticate",
  );

  await assertRejectsWithMessage(
    () =>
      userWrites.disableUser({
        currentUserId: owner.id,
        targetUserId: owner.id,
      }),
    "Transfer ownership before disabling the owner account.",
    "the owner should not be able to disable themselves",
  );

  return owner;
}

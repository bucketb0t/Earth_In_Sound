import type {
  NormalUserTestResult,
  UserDatabaseTestContext,
} from "./test-user-context";
import {
  assert,
  assertRejectsWithMessage,
} from "./test-user-helpers";

/**
 * Verifies every public user-read path, including normalization, absent rows,
 * current-session lookup behavior, bounded search, and invalid identifiers.
 */
export async function testUserReads(
  context: UserDatabaseTestContext,
  normalUser: NormalUserTestResult,
): Promise<void> {
  const { userReads } = context;

  const storedUser = await userReads.getUserById(`  ${normalUser.user.id}  `);
  assert(storedUser !== null, "a stored user should be found by a trimmed id");

  assert(
    (await userReads.getUserByAuthProviderId(normalUser.authUserId))?.id ===
      storedUser.id,
    "an auth provider id should resolve to its project user",
  );
  assert(
    (
      await userReads.getCurrentUser({
        authProviderUserId: normalUser.authUserId,
      })
    )?.id === storedUser.id,
    "current-user lookup should resolve a logged-in auth id",
  );

  for (const missingAuthId of [null, undefined, "   "]) {
    assert(
      (await userReads.getCurrentUser({ authProviderUserId: missingAuthId })) ===
        null,
      "current-user lookup should return null without an auth id",
    );
  }

  assert(
    (await userReads.getUserByEmail(normalUser.email.toUpperCase()))?.id ===
      storedUser.id,
    "email lookup should be case-insensitive",
  );
  assert(
    (await userReads.getUserByUsername(storedUser.username.toUpperCase()))?.id ===
      storedUser.id,
    "username lookup should be case-insensitive",
  );
  assert(
    (await userReads.getUserById("missing-user-id")) === null,
    "an unknown project user id should return null",
  );
  assert(
    (await userReads.getUserByAuthProviderId("missing-auth-id")) === null,
    "an unknown auth provider id should return null",
  );

  const emailSearchResults = await userReads.searchUsers({
    searchText: normalUser.email.toUpperCase(),
    limit: 0,
  });
  assert(
    emailSearchResults.length === 1 &&
      emailSearchResults[0]?.id === storedUser.id,
    "search should normalize text and clamp its minimum limit to one",
  );
  assert(
    (await userReads.searchUsers({ searchText: "   " })).length === 0,
    "blank search should return no rows",
  );
  assert(
    (await userReads.searchUsers({ searchText: "%" })).length === 0 &&
      (await userReads.searchUsers({ searchText: "_" })).length === 0,
    "SQL wildcard characters should be searched as literal text",
  );

  await assertRejectsWithMessage(
    () => userReads.getUserById("   "),
    "User id is required.",
    "blank project user ids should be rejected",
  );
  await assertRejectsWithMessage(
    () => userReads.getUserByAuthProviderId("   "),
    "Auth provider user id is required.",
    "blank auth provider ids should be rejected",
  );
  await assertRejectsWithMessage(
    () => userReads.getUserByUsername("   "),
    "Username is required.",
    "blank username lookups should be rejected",
  );
  await assertRejectsWithMessage(
    () => userReads.getUserByEmail("not-an-email"),
    "Enter a valid email address.",
    "invalid email lookups should be rejected",
  );
}

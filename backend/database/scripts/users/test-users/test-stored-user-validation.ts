import {
  parseStoredUser,
  parseStoredUsers,
  type StoredUser,
} from "../../../users/validation/validate-stored-user";
import { assert, assertThrows } from "./test-user-helpers";

/*
 * A complete valid row used as the starting point for each validation test.
 */
const validUserRow: StoredUser = {
  id: "test-user-id",
  auth_provider_user_id: "test-auth-id",
  email: "test@example.com",
  email_lookup: "test@example.com",
  username: "test-user",
  username_lookup: "test-user",
  role: "user",
  status: "active",
  created_at: 1_700_000_000_000,
  updated_at: 1_700_000_000_100,
};

/**
 * Tests the runtime boundary between database rows and application user data.
 */
export function runStoredUserValidationTests(): void {
  /*
   * A correctly shaped row should pass without being changed.
   */
  const parsedUser = parseStoredUser(validUserRow);

  assert(
    parsedUser.id === validUserRow.id,
    "a valid user row should be accepted",
  );

  /*
   * The auth provider id may legitimately be null.
   */
  const userWithoutAuthLink = parseStoredUser({
    ...validUserRow,
    auth_provider_user_id: null,
  });

  assert(
    userWithoutAuthLink.auth_provider_user_id === null,
    "a null auth provider id should be accepted",
  );

  /*
   * Unknown roles must not enter the application.
   */
  assertThrows(
    () =>
      parseStoredUser({
        ...validUserRow,
        role: "super-admin",
      }),
    "an unknown user role should be rejected",
  );

  /*
   * updated_at cannot describe a time before the user was created.
   */
  assertThrows(
    () =>
      parseStoredUser({
        ...validUserRow,
        updated_at: validUserRow.created_at - 1,
      }),
    "an invalid timestamp order should be rejected",
  );

  /*
   * Strict validation should reveal unexpected database columns.
   */
  assertThrows(
    () =>
      parseStoredUser({
        ...validUserRow,
        unexpected_column: true,
      }),
    "an unexpected user column should be rejected",
  );

  /*
   * A list is valid only when every row inside it is valid.
   */
  const parsedUsers = parseStoredUsers([
    validUserRow,
    {
      ...validUserRow,
      id: "second-user-id",
      auth_provider_user_id: "second-auth-id",
      email: "second@example.com",
      email_lookup: "second@example.com",
      username: "second-user",
      username_lookup: "second-user",
    },
  ]);

  assert(parsedUsers.length === 2, "a valid user list should be accepted");

  assertThrows(
    () =>
      parseStoredUsers([
        validUserRow,
        {
          ...validUserRow,
          status: "blocked",
        },
      ]),
    "a list containing an invalid user should be rejected",
  );

  /*
   * One user object must not be mistaken for an array of users.
   */
  assertThrows(
    () => parseStoredUsers(validUserRow),
    "a non-array user result should be rejected",
  );

  console.log("Stored user validation tests passed.");
}

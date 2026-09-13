import {
  parseStoredUser,
  parseStoredUsers,
  type StoredUser,
} from "../../../users/validation/validate-stored-user";
import { assert, assertThrows } from "./test-user-helpers";

/* Valid row fixture for runtime validation tests. */
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

/** Test row validation, schema strictness, and complete-list validation. */
export function runStoredUserValidationTests(): void {
  /* Accept a valid row unchanged. */
  const parsedUser = parseStoredUser(validUserRow);

  assert(
    parsedUser.id === validUserRow.id,
    "a valid user row should be accepted",
  );

  /* Accept null auth links. */
  const userWithoutAuthLink = parseStoredUser({
    ...validUserRow,
    auth_provider_user_id: null,
  });

  assert(
    userWithoutAuthLink.auth_provider_user_id === null,
    "a null auth provider id should be accepted",
  );

  /* Reject unknown roles. */
  assertThrows(
    () =>
      parseStoredUser({
        ...validUserRow,
        role: "super-admin",
      }),
    "an unknown user role should be rejected",
  );

  /* Reject update timestamps before creation. */
  assertThrows(
    () =>
      parseStoredUser({
        ...validUserRow,
        updated_at: validUserRow.created_at - 1,
      }),
    "an invalid timestamp order should be rejected",
  );

  /* Reject unexpected columns. */
  assertThrows(
    () =>
      parseStoredUser({
        ...validUserRow,
        unexpected_column: true,
      }),
    "an unexpected user column should be rejected",
  );

  /* Reject a list containing any invalid row. */
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

  /* Reject a user object supplied as a list. */
  assertThrows(
    () => parseStoredUsers(validUserRow),
    "a non-array user result should be rejected",
  );

  console.log("Stored user validation tests passed.");
}

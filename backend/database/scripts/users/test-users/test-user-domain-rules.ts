import {
  getRoleRank,
  requireActiveUser,
  requireCanManageUser,
  requireStoredUser,
} from "../../../users/permissions/user-permissions";
import {
  getDeletedEmailLookup,
  requireValidEmail,
  requireValidUsername,
  toLookupValue,
} from "../../../users/validation/validate-user-input";
import type { StoredUser } from "../../../users/validation/validate-stored-user";
import {
  assert,
  assertThrowsWithMessage,
} from "./test-user-helpers";

const baseUser: StoredUser = {
  id: "base-user-id",
  auth_provider_user_id: "base-auth-id",
  email: "base@example.com",
  email_lookup: "base@example.com",
  username: "base-user",
  username_lookup: "base-user",
  role: "user",
  status: "active",
  created_at: 1_700_000_000_000,
  updated_at: 1_700_000_000_000,
};

function createUser(
  id: string,
  role: StoredUser["role"],
  status: StoredUser["status"] = "active",
): StoredUser {
  return {
    ...baseUser,
    id,
    auth_provider_user_id: `${id}-auth`,
    email: `${id}@example.com`,
    email_lookup: `${id}@example.com`,
    username: id,
    username_lookup: id,
    role,
    status,
  };
}

/** Test input normalization and permissions before database setup. */
export function runUserDomainRuleTests(): void {
  testLookupValues();
  testEmailValidation();
  testUsernameValidation();
  testUserGuards();
  testManagementPermissions();

  console.log("User domain rule tests passed.");
}

function testLookupValues(): void {
  assert(
    toLookupValue("Mixed.Name") === "mixed.name",
    "lookup values should be case-insensitive",
  );

  const firstDeletedLookup = getDeletedEmailLookup("user-1", 100);
  const secondDeletedLookup = getDeletedEmailLookup("user-1", 101);

  assert(
    firstDeletedLookup === "deleted-email:user-1:100",
    "deleted email lookup should include the user and deletion time",
  );
  assert(
    firstDeletedLookup !== secondDeletedLookup,
    "separate deletion attempts should receive separate lookup values",
  );
}

function testEmailValidation(): void {
  assert(
    requireValidEmail("  Person@Example.COM  ") === "Person@Example.COM",
    "email validation should trim edges and preserve visible casing",
  );

  const invalidEmailCases = [
    { value: "", message: "Email is required." },
    { value: "person @example.com", message: "Email cannot contain spaces." },
    { value: "person@example", message: "Enter a valid email address." },
    { value: "person.example.com", message: "Enter a valid email address." },
  ] as const;

  for (const invalidEmail of invalidEmailCases) {
    assertThrowsWithMessage(
      () => requireValidEmail(invalidEmail.value),
      invalidEmail.message,
      `email validation should reject ${JSON.stringify(invalidEmail.value)}`,
    );
  }
}

function testUsernameValidation(): void {
  const validUsernames = [
    "abc",
    "user-name",
    "user_name",
    "user.name",
    "a".repeat(32),
  ];

  for (const validUsername of validUsernames) {
    assert(
      requireValidUsername(`  ${validUsername}  `) === validUsername,
      `username validation should accept ${validUsername}`,
    );
  }

  const lengthMessage = "Username must be between 3 and 32 characters.";
  assertThrowsWithMessage(
    () => requireValidUsername("ab"),
    lengthMessage,
    "usernames shorter than three characters should be rejected",
  );
  assertThrowsWithMessage(
    () => requireValidUsername("a".repeat(33)),
    lengthMessage,
    "usernames longer than 32 characters should be rejected",
  );

  const characterMessage =
    'Username may use letters, numbers, "-", "_" and ".", but separators cannot touch.';
  for (const invalidUsername of [
    ".username",
    "username-",
    "user..name",
    "user-_name",
    "user name",
    "user@name",
  ]) {
    assertThrowsWithMessage(
      () => requireValidUsername(invalidUsername),
      characterMessage,
      `username validation should reject ${invalidUsername}`,
    );
  }
}

function testUserGuards(): void {
  const activeUser = createUser("active-user", "user");
  const disabledUser = createUser("disabled-user", "user", "disabled");
  const deletedUser = createUser("deleted-user", "user", "deleted");

  assert(
    requireStoredUser(activeUser) === activeUser,
    "the existence guard should return a present user",
  );
  assertThrowsWithMessage(
    () => requireStoredUser(null, "Missing test user."),
    "Missing test user.",
    "the existence guard should preserve its caller-specific message",
  );
  assert(
    requireActiveUser(activeUser) === activeUser,
    "the active-user guard should return an active user",
  );

  for (const inactiveUser of [disabledUser, deletedUser]) {
    assertThrowsWithMessage(
      () => requireActiveUser(inactiveUser),
      "User account is not active.",
      `${inactiveUser.status} users should fail the active-user guard`,
    );
  }

  assert(
    getRoleRank("owner") > getRoleRank("admin") &&
      getRoleRank("admin") > getRoleRank("user"),
    "role ranks should follow owner, admin, user order",
  );
}

function testManagementPermissions(): void {
  const owner = createUser("owner-user", "owner");
  const admin = createUser("admin-user", "admin");
  const secondAdmin = createUser("second-admin", "admin");
  const user = createUser("normal-user", "user");
  const secondUser = createUser("second-user", "user");

  requireCanManageUser(user, user);
  requireCanManageUser(owner, admin);
  requireCanManageUser(owner, user);
  requireCanManageUser(admin, user);

  const permissionMessage = "You do not have permission to manage this user.";
  const rejectedPairs = [
    [user, secondUser],
    [user, admin],
    [admin, secondAdmin],
    [admin, owner],
  ] as const;

  for (const [currentUser, targetUser] of rejectedPairs) {
    assertThrowsWithMessage(
      () => requireCanManageUser(currentUser, targetUser),
      permissionMessage,
      `${currentUser.role} should not manage a different ${targetUser.role}`,
    );
  }
}

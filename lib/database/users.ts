import { randomUUID } from "node:crypto";

import { turso } from "./turso";

export type UserRole = "owner" | "admin" | "user";
export type UserStatus = "active" | "disabled" | "deleted";

export interface StoredUser {
  id: string;
  auth_provider_user_id: string | null;
  email: string;
  email_lookup: string;
  username: string;
  username_lookup: string;
  role: UserRole;
  status: UserStatus;
  created_at: number;
  updated_at: number;
}

interface CreateLocalOwnerInput {
  email: string;
  username: string;
}

interface UpdateUsernameInput {
  currentUserId: string;
  username: string;
}

interface SearchUsersInput {
  searchText: string;
  limit?: number;
}

interface DisableUserInput {
  currentUserId: string;
  targetUserId: string;
}

interface DeleteUserInput {
  currentUserId: string;
  targetUserId: string;
}

interface ReactivateUserInput {
  currentUserId: string;
  targetUserId: string;
}
/**
 * Fetches one user by internal database id.
 * Most permission checks start here because actions usually compare
 * the acting user against the target user.
 */
export async function getUserById(userId: string): Promise<StoredUser | null> {
  const cleanedUserId = userId.trim();

  if (!cleanedUserId) {
    throw new Error("User id is required.");
  }

  const result = await turso.execute({
    sql: "SELECT * FROM users WHERE id = ? LIMIT 1",
    args: [cleanedUserId],
  });

  return (result.rows[0] as unknown as StoredUser | undefined) ?? null;
}

/**
 * Fetches one user by the external auth provider id.
 * This will become the bridge between login/session data and the app user row.
 */
export async function getUserByAuthProviderId(
  authProviderUserId: string,
): Promise<StoredUser | null> {
  const cleanedAuthProviderUserId = authProviderUserId.trim();

  if (!cleanedAuthProviderUserId) {
    throw new Error("Auth provider user id is required.");
  }

  const result = await turso.execute({
    sql: "SELECT * FROM users WHERE auth_provider_user_id = ? LIMIT 1",
    args: [cleanedAuthProviderUserId],
  });

  return (result.rows[0] as unknown as StoredUser | undefined) ?? null;
}

/**
 * Validates the visible email value.
 * The original casing is kept for display, while email_lookup handles searches.
 */
function requireValidEmail(email: string): string {
  const cleanedEmail = email.trim();

  if (!cleanedEmail) {
    throw new Error("Email is required.");
  }

  if (/\s/.test(cleanedEmail)) {
    throw new Error("Email cannot contain spaces.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  return cleanedEmail;
}

/**
 * Usernames may contain letters, numbers, "-", "_" and ".".
 * A separator cannot appear first, last, or directly next to another separator.
 */
function requireValidUsername(username: string): string {
  const cleanedUsername = username.trim();

  if (!cleanedUsername) {
    throw new Error("Username is required.");
  }

  if (cleanedUsername.length < 3 || cleanedUsername.length > 32) {
    throw new Error("Username must be between 3 and 32 characters.");
  }

  if (
    !/^[A-Za-z0-9](?:[A-Za-z0-9]|[-_.](?=[A-Za-z0-9]))*$/.test(cleanedUsername)
  ) {
    throw new Error(
      'Username may use letters, numbers, "-", "_" and ".", but separators cannot touch.',
    );
  }

  return cleanedUsername;
}

/**
 * Lookup values make searching and uniqueness reliable without changing the
 * display values the user typed.
 */
function toLookupValue(value: string): string {
  return value.toLowerCase();
}

/**
 * Deleted accounts release email/auth uniqueness without removing the row.
 * The archived lookup stays unique, while the visible email remains available
 * for audit/admin review until a privacy policy says otherwise.
 */
function getDeletedEmailLookup(userId: string, deletedAt: number): string {
  return `deleted-email:${userId}:${deletedAt}`;
}

/**
 * Confirms that a loaded user row actually exists.
 * This keeps later permission code from silently acting on missing users.
 */
function requireStoredUser(
  user: StoredUser | null,
  message = "User was not found.",
): StoredUser {
  if (!user) {
    throw new Error(message);
  }

  return user;
}

/**
 * Disabled or deleted users should not perform account actions.
 * Deleted is treated as a soft-deleted account, not a physically removed row.
 */
function requireActiveUser(user: StoredUser): StoredUser {
  if (user.status !== "active") {
    throw new Error("User account is not active.");
  }

  return user;
}

/**
 * Owner is the highest role, then admin, then normal user.
 * The number makes permission comparisons simple later.
 */
function getRoleRank(role: UserRole): number {
  const roleRanks: Record<UserRole, number> = {
    owner: 3,
    admin: 2,
    user: 1,
  };

  return roleRanks[role];
}

/**
 * Checks whether the current active user can manage another user account.
 *
 * Rules:
 * - everyone can manage their own normal account actions
 * - owner can manage admins and users
 * - admin can manage normal users
 * - users cannot manage other users
 */
function requireCanManageUser(
  currentUser: StoredUser,
  targetUser: StoredUser,
): void {
  if (currentUser.id === targetUser.id) {
    return;
  }

  const currentUserRoleRank = getRoleRank(currentUser.role);
  const targetUserRoleRank = getRoleRank(targetUser.role);

  if (currentUserRoleRank <= targetUserRoleRank) {
    throw new Error("You do not have permission to manage this user.");
  }
}

/**
 * Creates the first local owner account.
 *
 * This creates the first Turso owner account during local/project setup.
 * It refuses to create a second owner because ownership should be unique.
 */
export async function createLocalOwner(
  input: CreateLocalOwnerInput,
): Promise<string> {
  const email = requireValidEmail(input.email);
  const username = requireValidUsername(input.username);
  const now = Date.now();

  const existingOwner = await turso.execute({
    sql: "SELECT id FROM users WHERE role = 'owner' LIMIT 1",
  });

  if (existingOwner.rows.length > 0) {
    throw new Error("Owner already exists.");
  }

  const existingEmail = await turso.execute({
    sql: "SELECT id FROM users WHERE email_lookup = ? LIMIT 1",
    args: [toLookupValue(email)],
  });

  if (existingEmail.rows.length > 0) {
    throw new Error("Email is already registered.");
  }

  const existingUsername = await turso.execute({
    sql: "SELECT id FROM users WHERE username_lookup = ? LIMIT 1",
    args: [toLookupValue(username)],
  });

  if (existingUsername.rows.length > 0) {
    throw new Error("Username is already registered.");
  }

  const ownerId = randomUUID();

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
      ownerId,
      email,
      toLookupValue(email),
      username,
      toLookupValue(username),
      now,
      now,
    ],
  });

  return ownerId;
}

/**
 * Fetches one user by email using the lookup value.
 * This is useful for testing before auth is connected.
 */
export async function getUserByEmail(
  email: string,
): Promise<StoredUser | null> {
  const cleanedEmail = requireValidEmail(email);

  const result = await turso.execute({
    sql: "SELECT * FROM users WHERE email_lookup = ? LIMIT 1",
    args: [toLookupValue(cleanedEmail)],
  });

  return (result.rows[0] as unknown as StoredUser | undefined) ?? null;
}

/**
 * Updates the current user's own visible username.
 *
 * No role can change another user's username.
 * The visible username keeps the user's casing.
 * username_lookup stores the lowercase version for uniqueness/search.
 */
export async function updateUsername(
  input: UpdateUsernameInput,
): Promise<StoredUser> {
  const currentUser = requireActiveUser(
    requireStoredUser(
      await getUserById(input.currentUserId),
      "Current user was not found.",
    ),
  );

  const cleanedUsername = requireValidUsername(input.username);
  const usernameLookup = toLookupValue(cleanedUsername);
  const now = Date.now();

  const existingUsername = await turso.execute({
    sql: "SELECT id FROM users WHERE username_lookup = ? AND id != ? LIMIT 1",
    args: [usernameLookup, currentUser.id],
  });

  if (existingUsername.rows.length > 0) {
    throw new Error("Username is already registered.");
  }

  await turso.execute({
    sql: `
      UPDATE users
      SET username = ?, username_lookup = ?, updated_at = ?
      WHERE id = ?
    `,
    args: [cleanedUsername, usernameLookup, now, currentUser.id],
  });

  const updatedUser = await getUserById(currentUser.id);

  return requireStoredUser(updatedUser, "Updated user was not found.");
}

/**
 * Searches users by partial email or username.
 *
 * The search uses lookup fields so it is case-insensitive while still keeping
 * the original email and username exactly as the user typed them.
 */
export async function searchUsers(
  input: SearchUsersInput,
): Promise<StoredUser[]> {
  const cleanedSearchText = input.searchText.trim();

  if (!cleanedSearchText) {
    return [];
  }

  const searchLookup = `%${toLookupValue(cleanedSearchText)}%`;
  const resultLimit = Math.min(Math.max(input.limit ?? 20, 1), 50);

  const result = await turso.execute({
    sql: `
      SELECT *
      FROM users
      WHERE email_lookup LIKE ?
         OR username_lookup LIKE ?
      ORDER BY email_lookup ASC
      LIMIT ?
    `,
    args: [searchLookup, searchLookup, resultLimit],
  });

  return result.rows as unknown as StoredUser[];
}

/**
 * Disables a user account without removing the database row.
 *
 * This is a soft account close:
 * - the user stays in the database
 * - status becomes "disabled"
 * - the account can theoretically be restored later
 *
 * The owner cannot disable their own account because the project must always keep one active owner-level account.
 */
export async function disableUser(
  input: DisableUserInput,
): Promise<StoredUser> {
  const currentUser = requireActiveUser(
    requireStoredUser(
      await getUserById(input.currentUserId),
      "Current user was not found.",
    ),
  );

  const targetUser = requireStoredUser(
    await getUserById(input.targetUserId),
    "Target user was not found.",
  );

  if (targetUser.status === "deleted") {
    throw new Error("Deleted users cannot be disabled.");
  }

  if (currentUser.id === targetUser.id && currentUser.role === "owner") {
    throw new Error("Transfer ownership before disabling the owner account.");
  }

  requireCanManageUser(currentUser, targetUser);

  const now = Date.now();

  await turso.execute({
    sql: `
      UPDATE users
      SET status = 'disabled', updated_at = ?
      WHERE id = ?
    `,
    args: [now, targetUser.id],
  });

  const disabledUser = await getUserById(targetUser.id);

  return requireStoredUser(disabledUser, "Disabled user was not found.");
}

/**
 * Soft-deletes a user account.
 *
 * Deleted accounts cannot act or be reactivated through the normal account
 * flow. The email lookup and auth-provider link are released so the same email
 * can be used by a new account later, without overwriting this historical row.
 */
export async function deleteUser(input: DeleteUserInput): Promise<StoredUser> {
  const currentUser = requireActiveUser(
    requireStoredUser(
      await getUserById(input.currentUserId),
      "Current user was not found.",
    ),
  );

  const targetUser = requireStoredUser(
    await getUserById(input.targetUserId),
    "Target user was not found.",
  );

  if (targetUser.status === "deleted") {
    throw new Error("User is already deleted.");
  }

  if (currentUser.id === targetUser.id && currentUser.role === "owner") {
    throw new Error("Transfer ownership before deleting the owner account.");
  }

  requireCanManageUser(currentUser, targetUser);

  const now = Date.now();

  await turso.execute({
    sql: `
      UPDATE users
      SET
        auth_provider_user_id = NULL,
        email_lookup = ?,
        status = 'deleted',
        updated_at = ?
      WHERE id = ?
    `,
    args: [getDeletedEmailLookup(targetUser.id, now), now, targetUser.id],
  });

  const deletedUser = await getUserById(targetUser.id);

  return requireStoredUser(deletedUser, "Deleted user was not found.");
}

/**
 * Reactivates a disabled account.
 *
 * Reactivation is intentionally limited to disabled accounts. Deleted accounts
 * are final in the normal UI flow, and active accounts do not need restoring.
 */
export async function reactivateUser(
  input: ReactivateUserInput,
): Promise<StoredUser> {
  const currentUser = requireActiveUser(
    requireStoredUser(
      await getUserById(input.currentUserId),
      "Current user was not found.",
    ),
  );

  const targetUser = requireStoredUser(
    await getUserById(input.targetUserId),
    "Target user was not found.",
  );

  if (targetUser.status !== "disabled") {
    throw new Error("Only disabled users can be reactivated.");
  }

  requireCanManageUser(currentUser, targetUser);

  const now = Date.now();

  await turso.execute({
    sql: `
      UPDATE users
      SET status = 'active', updated_at = ?
      WHERE id = ?
    `,
    args: [now, targetUser.id],
  });

  const reactivatedUser = await getUserById(targetUser.id);

  return requireStoredUser(
    reactivatedUser,
    "Reactivated user was not found.",
  );
}

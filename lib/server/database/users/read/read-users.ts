import { turso } from "../../turso-client";
import {
  requireValidEmail,
  toLookupValue,
} from "../validation/validate-user-input";

/*
 * Role and status values allowed by the users table.
 */
export type UserRole = "owner" | "admin" | "user";
export type UserStatus = "active" | "disabled" | "deleted";

/*
 * Database row shape returned by the project users table.
 */
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

export interface SearchUsersInput {
  searchText: string;
  limit?: number;
}

export interface GetCurrentUserInput {
  authProviderUserId: string | null | undefined;
}

/**
 * Fetches one user by internal database id.
 *
 * Use this when code already knows the Earth In Sound users.id value. This id
 * is different from Better Auth's user.id.
 */
export async function getUserById(userId: string): Promise<StoredUser | null> {
  /*
   * Trim ids from route/session input before querying.
   */
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
 *
 * This is the bridge from Better Auth into the project table. Better Auth owns
 * its user.id; the project stores that same value in auth_provider_user_id.
 */
export async function getUserByAuthProviderId(
  authProviderUserId: string,
): Promise<StoredUser | null> {
  /*
   * auth_provider_user_id links Better Auth's user.id to the project user row.
   */
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
 * Resolves the currently logged-in auth provider user to a stored user row.
 *
 * Future server-side pages/actions can call this after reading the Better Auth
 * session. If there is no logged-in auth id, there is no project user to load.
 */
export async function getCurrentUser(
  input: GetCurrentUserInput,
): Promise<StoredUser | null> {
  const authProviderUserId = input.authProviderUserId?.trim();

  if (!authProviderUserId) {
    return null;
  }

  return getUserByAuthProviderId(authProviderUserId);
}

/**
 * Fetches one user by email using the lookup value.
 *
 * The visible email keeps the user's original casing, but email_lookup is
 * lowercase so searches and duplicate checks behave consistently.
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
 * Fetches one user by username using the lookup value.
 *
 * Usernames are preserved for display, but username_lookup lets the database
 * reject case-insensitive duplicates.
 */
export async function getUserByUsername(
  username: string,
): Promise<StoredUser | null> {
  const cleanedUsername = username.trim();

  if (!cleanedUsername) {
    throw new Error("Username is required.");
  }

  const result = await turso.execute({
    sql: "SELECT * FROM users WHERE username_lookup = ? LIMIT 1",
    args: [toLookupValue(cleanedUsername)],
  });

  return (result.rows[0] as unknown as StoredUser | undefined) ?? null;
}

/**
 * Searches users by partial email or username.
 *
 * This is intended for owner/admin panels later. It searches lookup fields, not
 * visible fields, so "and" can find "Andrew" and "andreea" without caring about
 * original letter casing.
 */
export async function searchUsers(
  input: SearchUsersInput,
): Promise<StoredUser[]> {
  /*
   * Empty search returns no rows instead of dumping the user table.
   */
  const cleanedSearchText = input.searchText.trim();

  if (!cleanedSearchText) {
    return [];
  }

  const searchLookup = `%${toLookupValue(cleanedSearchText)}%`;
  /*
   * Clamp limits so a caller cannot request an unbounded user list.
   */
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

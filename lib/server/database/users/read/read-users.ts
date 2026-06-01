import { turso } from "../../turso-client";
import {
  requireValidEmail,
  toLookupValue,
} from "../validation/validate-user-input";

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

export interface SearchUsersInput {
  searchText: string;
  limit?: number;
}

export interface GetCurrentUserInput {
  authProviderUserId: string | null | undefined;
}

/**
 * Fetches one user by internal database id.
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
 * Resolves the currently logged-in auth provider user to a stored user row.
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
 * Searches users by partial email or username.
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

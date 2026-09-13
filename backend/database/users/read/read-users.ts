import { turso } from "../../turso-client";
import {
  requireValidEmail,
  toLookupValue,
} from "../validation/validate-user-input";
import {
  parseStoredUser,
  parseStoredUsers,
  type StoredUser,
} from "../validation/validate-stored-user";

export type {
  StoredUser,
  UserRole,
  UserStatus,
} from "../validation/validate-stored-user";

export interface SearchUsersInput {
  searchText: string;
  limit?: number;
}

export interface GetCurrentUserInput {
  authProviderUserId: string | null | undefined;
}

function parseOptionalStoredUser(row: unknown): StoredUser | null {
  if (row === undefined) {
    return null;
  }

  return parseStoredUser(row);
}

/* Treat LIKE wildcards as literal search text. */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** Look up the project user ID, distinct from Better Auth's user ID. */
export async function getUserById(userId: string): Promise<StoredUser | null> {
  const cleanedUserId = userId.trim();

  if (!cleanedUserId) {
    throw new Error("User id is required.");
  }

  const result = await turso.execute({
    sql: "SELECT * FROM users WHERE id = ? LIMIT 1",
    args: [cleanedUserId],
  });

  return parseOptionalStoredUser(result.rows[0]);
}

/** Resolve Better Auth's user ID through auth_provider_user_id. */
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

  return parseOptionalStoredUser(result.rows[0]);
}

/** The partial unique index guarantees at most one owner. */
export async function getOwner(): Promise<StoredUser | null> {
  const result = await turso.execute(
    "SELECT * FROM users WHERE role = 'owner' LIMIT 1",
  );

  return parseOptionalStoredUser(result.rows[0]);
}

/** Resolve a session's auth ID to a project profile; missing sessions return null. */
export async function getCurrentUser(
  input: GetCurrentUserInput,
): Promise<StoredUser | null> {
  const authProviderUserId = input.authProviderUserId?.trim();

  if (!authProviderUserId) {
    return null;
  }

  return getUserByAuthProviderId(authProviderUserId);
}

/** Use the normalized email key while preserving display casing. */
export async function getUserByEmail(
  email: string,
): Promise<StoredUser | null> {
  const cleanedEmail = requireValidEmail(email);

  const result = await turso.execute({
    sql: "SELECT * FROM users WHERE email_lookup = ? LIMIT 1",
    args: [toLookupValue(cleanedEmail)],
  });

  return parseOptionalStoredUser(result.rows[0]);
}

/** Use the normalized username key while preserving display casing. */
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

  return parseOptionalStoredUser(result.rows[0]);
}

/** Search normalized email and username keys with a bounded result limit. */
export async function searchUsers(
  input: SearchUsersInput,
): Promise<StoredUser[]> {
  /* Empty searches return no users. */
  const cleanedSearchText = input.searchText.trim();

  if (!cleanedSearchText) {
    return [];
  }

  const searchLookup = `%${escapeLikePattern(
    toLookupValue(cleanedSearchText),
  )}%`;
  /* Bound search results to prevent unbounded queries. */
  const resultLimit = Math.min(Math.max(input.limit ?? 20, 1), 50);

  const result = await turso.execute({
    sql: `
      SELECT *
      FROM users
      WHERE email_lookup LIKE ? ESCAPE '\\'
         OR username_lookup LIKE ? ESCAPE '\\'
      ORDER BY email_lookup ASC
      LIMIT ?
    `,
    args: [searchLookup, searchLookup, resultLimit],
  });

  return parseStoredUsers(result.rows);
}

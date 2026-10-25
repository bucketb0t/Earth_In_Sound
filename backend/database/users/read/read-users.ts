import type { Client } from "@libsql/client";
import {
  requireValidEmail,
  requireValidUsername,
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

export interface UserReader {
  getUserById(userId: string): Promise<StoredUser | null>;
  getUserByAuthProviderId(
    authProviderUserId: string,
  ): Promise<StoredUser | null>;
  getOwner(): Promise<StoredUser | null>;
  getCurrentUser(input: GetCurrentUserInput): Promise<StoredUser | null>;
  getUserByEmail(email: string): Promise<StoredUser | null>;
  getUserByUsername(username: string): Promise<StoredUser | null>;
  searchUsers(input: SearchUsersInput): Promise<StoredUser[]>;
}

type UserReadDatabase = Pick<Client, "execute">;

function parseOptionalStoredUser(row: unknown): StoredUser | null {
  return row === undefined ? null : parseStoredUser(row);
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** Create user queries against an explicitly supplied database client. */
export function createUserReader(database: UserReadDatabase): UserReader {
  async function getUserById(userId: string): Promise<StoredUser | null> {
    const cleanedUserId = userId.trim();

    if (!cleanedUserId) {
      throw new Error("User id is required.");
    }

    const result = await database.execute({
      sql: "SELECT * FROM users WHERE id = ? LIMIT 1",
      args: [cleanedUserId],
    });

    return parseOptionalStoredUser(result.rows[0]);
  }

  async function getUserByAuthProviderId(
    authProviderUserId: string,
  ): Promise<StoredUser | null> {
    const cleanedAuthProviderUserId = authProviderUserId.trim();

    if (!cleanedAuthProviderUserId) {
      throw new Error("Auth provider user id is required.");
    }

    const result = await database.execute({
      sql: "SELECT * FROM users WHERE auth_provider_user_id = ? LIMIT 1",
      args: [cleanedAuthProviderUserId],
    });

    return parseOptionalStoredUser(result.rows[0]);
  }

  async function getOwner(): Promise<StoredUser | null> {
    const result = await database.execute(
      "SELECT * FROM users WHERE role = 'owner' LIMIT 1",
    );

    return parseOptionalStoredUser(result.rows[0]);
  }

  async function getCurrentUser(
    input: GetCurrentUserInput,
  ): Promise<StoredUser | null> {
    const authProviderUserId = input.authProviderUserId?.trim();
    return authProviderUserId
      ? getUserByAuthProviderId(authProviderUserId)
      : null;
  }

  async function getUserByEmail(email: string): Promise<StoredUser | null> {
    const cleanedEmail = requireValidEmail(email);
    const result = await database.execute({
      sql: "SELECT * FROM users WHERE email_lookup = ? LIMIT 1",
      args: [toLookupValue(cleanedEmail)],
    });

    return parseOptionalStoredUser(result.rows[0]);
  }

  async function getUserByUsername(
    username: string,
  ): Promise<StoredUser | null> {
    const cleanedUsername = requireValidUsername(username);
    const result = await database.execute({
      sql: "SELECT * FROM users WHERE username_lookup = ? LIMIT 1",
      args: [toLookupValue(cleanedUsername)],
    });

    return parseOptionalStoredUser(result.rows[0]);
  }

  async function searchUsers(input: SearchUsersInput): Promise<StoredUser[]> {
    const cleanedSearchText = input.searchText.trim();

    if (!cleanedSearchText) {
      return [];
    }

    const searchLookup = `%${escapeLikePattern(
      toLookupValue(cleanedSearchText),
    )}%`;
    const resultLimit = Math.min(Math.max(input.limit ?? 20, 1), 50);
    const result = await database.execute({
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

  return Object.freeze({
    getUserById,
    getUserByAuthProviderId,
    getOwner,
    getCurrentUser,
    getUserByEmail,
    getUserByUsername,
    searchUsers,
  });
}

import { randomUUID } from "node:crypto";

import { turso } from "./turso";

type UserRole = "owner" | "admin" | "user";
type UserStatus = "active" | "disabled" | "deleted";

interface StoredUser {
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

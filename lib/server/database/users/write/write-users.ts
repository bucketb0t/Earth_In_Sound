import { randomUUID } from "node:crypto";

import { turso } from "../../turso-client";
import {
  requireActiveUser,
  requireCanManageUser,
  requireStoredUser,
} from "../permissions/user-permissions";
import { getUserByEmail, getUserById, type StoredUser } from "../read/read-users";
import {
  getDeletedEmailLookup,
  requireValidEmail,
  requireValidUsername,
  toLookupValue,
} from "../validation/validate-user-input";

export interface CreateLocalOwnerInput {
  email: string;
  username: string;
}

export interface UpdateUsernameInput {
  currentUserId: string;
  username: string;
}

export interface DisableUserInput {
  currentUserId: string;
  targetUserId: string;
}

export interface DeleteUserInput {
  currentUserId: string;
  targetUserId: string;
}

export interface ReactivateUserInput {
  currentUserId: string;
  targetUserId: string;
}

/**
 * Creates the first local owner account.
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
 * Updates the current user's own visible username.
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
 * Disables a user account without removing the database row.
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

export { getUserByEmail };

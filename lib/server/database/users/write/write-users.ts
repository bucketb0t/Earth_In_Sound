import { randomUUID } from "node:crypto";
import { turso } from "../../turso-client";
import {
  requireActiveUser,
  requireCanManageUser,
  requireStoredUser,
} from "../permissions/user-permissions";
import {
  getUserByAuthProviderId,
  getUserByEmail,
  getUserById,
  type StoredUser,
  type UserRole,
} from "../read/read-users";
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

export interface TransferOwnershipInput {
  currentOwnerId: string;
  targetUserId: string;
}

export interface CreateNormalUserAfterSignupInput {
  authProviderUserId: string;
  email: string;
  username: string;
}

export type AssignableUserRole = Exclude<UserRole, "owner">;

export interface SetUserRoleInput {
  currentOwnerId: string;
  targetUserId: string;
  targetRole: AssignableUserRole;
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
 * Creates a normal user row after signup authentication succeeds.
 */
export async function createNormalUserAfterSignup(
  input: CreateNormalUserAfterSignupInput,
): Promise<StoredUser> {
  const authProviderUserId = input.authProviderUserId.trim();

  if (!authProviderUserId) {
    throw new Error("Auth provider user id is required.");
  }

  const existingAuthUser = await getUserByAuthProviderId(authProviderUserId);

  if (existingAuthUser) {
    return existingAuthUser;
  }

  const email = requireValidEmail(input.email);
  const username = requireValidUsername(input.username);
  const now = Date.now();

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

  const userId = randomUUID();

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
      VALUES (?, ?, ?, ?, ?, ?, 'user', 'active', ?, ?)
    `,
    args: [
      userId,
      authProviderUserId,
      email,
      toLookupValue(email),
      username,
      toLookupValue(username),
      now,
      now,
    ],
  });

  const createdUser = await getUserById(userId);

  return requireStoredUser(createdUser, "Created user was not found.");
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

  return requireStoredUser(reactivatedUser, "Reactivated user was not found.");
}

export { getUserByEmail };

/**
 * Transfers the single owner role to another active account.
 */
export async function transferOwnership(
  input: TransferOwnershipInput,
): Promise<StoredUser> {
  const currentOwner = requireActiveUser(
    requireStoredUser(
      await getUserById(input.currentOwnerId),
      "Current owner was not found.",
    ),
  );

  if (currentOwner.role !== "owner") {
    throw new Error("Only the owner can transfer ownership.");
  }

  const targetUser = requireActiveUser(
    requireStoredUser(
      await getUserById(input.targetUserId),
      "Target user was not found.",
    ),
  );

  if (targetUser.id === currentOwner.id) {
    throw new Error("Ownership is already assigned to this user.");
  }

  const now = Date.now();

  await turso.batch(
    [
      {
        sql: `
          UPDATE users
          SET role = 'admin', updated_at = ?
          WHERE id = ?
        `,
        args: [now, currentOwner.id],
      },
      {
        sql: `
          UPDATE users
          SET role = 'owner', updated_at = ?
          WHERE id = ?
        `,
        args: [now, targetUser.id],
      },
    ],
    "write",
  );

  const newOwner = await getUserById(targetUser.id);

  return requireStoredUser(newOwner, "New owner was not found.");
}

/**
 * Lets the owner promote or demote active non-owner accounts.
 */
export async function setUserRole(
  input: SetUserRoleInput,
): Promise<StoredUser> {
  const currentOwner = requireActiveUser(
    requireStoredUser(
      await getUserById(input.currentOwnerId),
      "Current owner was not found.",
    ),
  );

  if (currentOwner.role !== "owner") {
    throw new Error("Only the owner can change user roles.");
  }

  const targetUser = requireActiveUser(
    requireStoredUser(
      await getUserById(input.targetUserId),
      "Target user was not found.",
    ),
  );

  if (targetUser.role === "owner") {
    throw new Error("Use ownership transfer to change the owner.");
  }

  if (targetUser.role === input.targetRole) {
    return targetUser;
  }

  const now = Date.now();

  await turso.execute({
    sql: `
      UPDATE users
      SET role = ?, updated_at = ?
      WHERE id = ?
    `,
    args: [input.targetRole, now, targetUser.id],
  });

  const updatedUser = await getUserById(targetUser.id);

  return requireStoredUser(updatedUser, "Updated user was not found.");
}

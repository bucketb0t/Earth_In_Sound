import { randomUUID } from "node:crypto";
import {
  deleteAuthUser,
  revokeAuthUserSessions,
} from "@/backend/authentication/auth-user-lifecycle";
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
  getUserByUsername,
  getOwner,
  type StoredUser,
  type UserRole,
} from "../read/read-users";
import {
  getDeletedEmailLookup,
  requireValidEmail,
  requireValidUsername,
  toLookupValue,
} from "../validation/validate-user-input";

/*
 * Write input types keep function calls explicit and readable.
 * Route handlers/server actions must derive currentUserId/currentOwnerId from
 * the authenticated session before calling these functions; browser input
 * should never be trusted to identify the acting user.
 */

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

export interface CreateOrLinkOwnerAfterSignupInput {
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
 * Creates the first owner profile or links a legacy unlinked owner profile.
 *
 * This function is called only from the server-only owner setup context after
 * Better Auth has created or found the corresponding auth record.
 */
export async function createOrLinkOwnerAfterSignup(
  input: CreateOrLinkOwnerAfterSignupInput,
): Promise<StoredUser> {
  const authProviderUserId = input.authProviderUserId.trim();

  if (!authProviderUserId) {
    throw new Error("Auth provider user id is required.");
  }

  const linkedUser = await getUserByAuthProviderId(authProviderUserId);
  if (linkedUser) {
    if (linkedUser.role !== "owner") {
      throw new Error("Auth account is already linked to a non-owner user.");
    }

    return linkedUser;
  }

  const email = requireValidEmail(input.email);
  const username = requireValidUsername(input.username);
  const emailLookup = toLookupValue(email);
  const usernameLookup = toLookupValue(username);
  const existingOwner = await getOwner();

  if (existingOwner) {
    if (
      existingOwner.status !== "active" ||
      existingOwner.email_lookup !== emailLookup ||
      existingOwner.username_lookup !== usernameLookup
    ) {
      throw new Error("Owner setup identity does not match the existing owner.");
    }

    if (
      existingOwner.auth_provider_user_id &&
      existingOwner.auth_provider_user_id !== authProviderUserId
    ) {
      throw new Error("Owner is already linked to another auth account.");
    }

    const now = Date.now();
    await turso.execute({
      sql: `
        UPDATE users
        SET auth_provider_user_id = ?, updated_at = ?
        WHERE id = ? AND auth_provider_user_id IS NULL
      `,
      args: [authProviderUserId, now, existingOwner.id],
    });

    const linkedOwner = await getUserById(existingOwner.id);
    const storedLinkedOwner = requireStoredUser(
      linkedOwner,
      "Linked owner was not found.",
    );

    if (storedLinkedOwner.auth_provider_user_id !== authProviderUserId) {
      throw new Error("Owner is already linked to another auth account.");
    }

    return storedLinkedOwner;
  }

  const existingEmail = await getUserByEmail(email);
  if (existingEmail) {
    throw new Error("Email is already registered.");
  }

  const existingUsername = await getUserByUsername(username);
  if (existingUsername) {
    throw new Error("Username is already registered.");
  }

  const ownerId = randomUUID();
  const now = Date.now();

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
      VALUES (?, ?, ?, ?, ?, ?, 'owner', 'active', ?, ?)
    `,
    args: [
      ownerId,
      authProviderUserId,
      email,
      emailLookup,
      username,
      usernameLookup,
      now,
      now,
    ],
  });

  const createdOwner = await getUserById(ownerId);
  return requireStoredUser(createdOwner, "Created owner was not found.");
}

/**
 * Creates a normal user row after signup authentication succeeds.
 *
 * Better Auth creates the secure auth record first. This function then creates
 * the Earth In Sound profile row and links it to Better Auth through
 * auth_provider_user_id. The role is hardcoded to "user" so public signup
 * cannot promote itself.
 */
export async function createNormalUserAfterSignup(
  input: CreateNormalUserAfterSignupInput,
): Promise<StoredUser> {
  /*
   * Better Auth passes its generated user id after password signup succeeds.
   */
  const authProviderUserId = input.authProviderUserId.trim();

  if (!authProviderUserId) {
    throw new Error("Auth provider user id is required.");
  }

  const existingAuthUser = await getUserByAuthProviderId(authProviderUserId);

  /*
   * Idempotency guard for repeated hooks or retry attempts.
   */
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

  /*
   * Signup always creates a normal active user.
   */
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
 *
 * No owner/admin override is accepted here. The caller can only pass the
 * current user's id, and the function updates that same row after validating
 * the new username and checking that it is not already taken.
 */
export async function updateUsername(
  input: UpdateUsernameInput,
): Promise<StoredUser> {
  /*
   * Username changes are self-service only.
   */
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
 *
 * Disabled means "temporarily blocked or inactive." The row keeps its original
 * email_lookup and username_lookup, so nobody else can reuse that identity
 * while the account is disabled. A disabled user can later be reactivated.
 */
export async function disableUser(
  input: DisableUserInput,
): Promise<StoredUser> {
  /*
   * Disabled accounts keep email/username reservations.
   */
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

  if (targetUser.auth_provider_user_id) {
    await revokeAuthUserSessions(targetUser.auth_provider_user_id);
  }

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
 * Deleted means "closed account." The row remains for audit/history, but the
 * auth link is removed and email_lookup is replaced so a future signup may
 * reuse the email. username_lookup remains reserved to prevent impersonation.
 * Deleted users are not reactivated through the normal reactivateUser path.
 */
export async function deleteUser(input: DeleteUserInput): Promise<StoredUser> {
  /*
   * Deleted accounts are soft-deleted so history can remain auditable.
   */
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

  /*
   * Better Auth must release the email and revoke every session before the
   * project profile releases its auth link. These are separate systems, so a
   * future production route should add recovery/compensation around failures.
   */
  if (targetUser.auth_provider_user_id) {
    await deleteAuthUser(targetUser.auth_provider_user_id);
  }

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
    args: [
      getDeletedEmailLookup(targetUser.id, now),
      now,
      targetUser.id,
    ],
  });

  const deletedUser = await getUserById(targetUser.id);

  return requireStoredUser(deletedUser, "Deleted user was not found.");
}

/**
 * Reactivates a disabled account.
 *
 * This only accepts status = "disabled". Deleted accounts are intentionally
 * excluded because their lookup fields/auth link were released.
 */
export async function reactivateUser(
  input: ReactivateUserInput,
): Promise<StoredUser> {
  /*
   * Only disabled accounts can come back through normal reactivation.
   */
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
 *
 * This is the only way ownership should move. The old owner becomes an admin,
 * and the target active user becomes owner in one batch write.
 */
export async function transferOwnership(
  input: TransferOwnershipInput,
): Promise<StoredUser> {
  /*
   * The project allows exactly one owner.
   */
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

  /*
   * Batch keeps the old owner demotion and new owner promotion together.
   */
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
 *
 * The owner role is excluded from targetRole. To change who owns the site, use
 * transferOwnership so the single-owner rule remains intact.
 */
export async function setUserRole(
  input: SetUserRoleInput,
): Promise<StoredUser> {
  /*
   * Role assignment intentionally excludes the owner role.
   */
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

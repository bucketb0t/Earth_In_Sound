import { randomUUID } from "node:crypto";
import {
  deleteLinkedUserRecords,
  disableLinkedUserRecords,
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

/* Derive acting user IDs from the authenticated server session, never from browser input. */

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

/** Create or link the first owner profile within the trusted owner setup context. */
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
      throw new Error(
        "Owner setup identity does not match the existing owner.",
      );
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

/** Link successful auth signups to active project profiles with the fixed user role. */
export async function createNormalUserAfterSignup(
  input: CreateNormalUserAfterSignupInput,
): Promise<StoredUser> {
  const authProviderUserId = input.authProviderUserId.trim();

  if (!authProviderUserId) {
    throw new Error("Auth provider user id is required.");
  }

  const existingAuthUser = await getUserByAuthProviderId(authProviderUserId);

  /* Repeated signup hooks must not create duplicate profiles. */
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

/** Self-service username update; enforce validation and uniqueness. */
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
  const transaction = await turso.transaction("write");

  try {
    const existingUsername = await transaction.execute({
      sql: "SELECT id FROM users WHERE username_lookup = ? AND id != ? LIMIT 1",
      args: [usernameLookup, currentUser.id],
    });

    if (existingUsername.rows.length > 0) {
      throw new Error("Username is already registered.");
    }

    const updatedProfile = await transaction.execute({
      sql: `
        UPDATE users
        SET username = ?, username_lookup = ?, updated_at = ?
        WHERE id = ? AND status = 'active'
      `,
      args: [cleanedUsername, usernameLookup, now, currentUser.id],
    });

    if (updatedProfile.rowsAffected !== 1) {
      throw new Error("User account is not active.");
    }

    /* Keep the auth display name and project username in the same transaction. */
    if (currentUser.auth_provider_user_id) {
      const updatedAuthUser = await transaction.execute({
        sql: 'UPDATE "user" SET name = ?, "updatedAt" = ? WHERE id = ?',
        args: [
          cleanedUsername,
          new Date(now).toISOString(),
          currentUser.auth_provider_user_id,
        ],
      });

      if (updatedAuthUser.rowsAffected !== 1) {
        throw new Error("Linked authentication user was not found.");
      }
    }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    transaction.close();
  }

  const updatedUser = await getUserById(currentUser.id);

  return requireStoredUser(updatedUser, "Updated user was not found.");
}

/** Disable without releasing email or username reservations; reactivation remains possible. */
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

  if (targetUser.auth_provider_user_id) {
    await disableLinkedUserRecords({
      authProviderUserId: targetUser.auth_provider_user_id,
      projectUserId: targetUser.id,
      disabledAt: now,
    });
  } else {
    await turso.execute({
      sql: `
        UPDATE users
        SET status = 'disabled', updated_at = ?
        WHERE id = ?
      `,
      args: [now, targetUser.id],
    });
  }

  const disabledUser = await getUserById(targetUser.id);

  return requireStoredUser(disabledUser, "Disabled user was not found.");
}

/**
 * Soft-delete and remove auth access. Release the email, reserve the username,
 * and prevent normal reactivation.
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
  const deletedEmailLookup = getDeletedEmailLookup(targetUser.id, now);

  /* Delete linked auth and profile records atomically; legacy unlinked profiles need only a profile update. */
  if (targetUser.auth_provider_user_id) {
    await deleteLinkedUserRecords({
      authProviderUserId: targetUser.auth_provider_user_id,
      projectUserId: targetUser.id,
      deletedEmailLookup,
      deletedAt: now,
    });
  } else {
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
      args: [deletedEmailLookup, now, targetUser.id],
    });
  }

  const deletedUser = await getUserById(targetUser.id);

  return requireStoredUser(deletedUser, "Deleted user was not found.");
}

/** Reactivate disabled accounts only; deleted identities have released their auth links. */
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

/** Transfer ownership atomically: demote the current owner to admin and promote the active target. */
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

  /* Batch both role changes so a failure preserves the current owner. */
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

/** Owner-only role changes for active non-owner accounts; ownership uses transferOwnership. */
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

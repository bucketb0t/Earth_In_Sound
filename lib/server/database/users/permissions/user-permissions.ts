import type { StoredUser, UserRole } from "../read/read-users";

/**
 * Confirms that a loaded user row actually exists.
 */
export function requireStoredUser(
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
export function requireActiveUser(user: StoredUser): StoredUser {
  if (user.status !== "active") {
    throw new Error("User account is not active.");
  }

  return user;
}

/**
 * Owner is the highest role, then admin, then normal user.
 */
export function getRoleRank(role: UserRole): number {
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
export function requireCanManageUser(
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

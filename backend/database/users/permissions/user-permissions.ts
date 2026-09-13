import type { StoredUser, UserRole } from "../read/read-users";

export function requireStoredUser(
  user: StoredUser | null,
  message = "User was not found.",
): StoredUser {
  if (!user) {
    throw new Error(message);
  }

  return user;
}

export function requireActiveUser(user: StoredUser): StoredUser {
  if (user.status !== "active") {
    throw new Error("User account is not active.");
  }

  return user;
}

/** Management requires a higher role rank: owner > admin > user. */
export function getRoleRank(role: UserRole): number {
  const roleRanks: Record<UserRole, number> = {
    owner: 3,
    admin: 2,
    user: 1,
  };

  return roleRanks[role];
}

/** Allow self-management or a higher-ranked manager. Check account activity separately. */
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

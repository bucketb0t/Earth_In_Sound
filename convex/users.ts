import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

type UserDoc = Doc<"users">;
type UserRole = UserDoc["role"];

const DEFAULT_SEARCH_LIMIT = 25;
const MAX_SEARCH_LIMIT = 100;

/*
 * Keeps the email exactly as the user typed it, including uppercase letters.
 * Only accidental spaces before or after the email are removed.
 */
function cleanEmailInput(email: string): string {
  return email.trim();
}

/*
 * Validates the basic email shape before saving or searching in Convex.
 * Clerk will later handle the real ownership check through email verification.
 */
function requireValidEmail(email: string): string {
  const cleanedEmail = cleanEmailInput(email);

  if (cleanedEmail.length === 0) {
    throw new Error("Email is required.");
  }

  if (/\s/.test(cleanedEmail)) {
    throw new Error("Email cannot contain spaces.");
  }

  if (cleanedEmail.includes("..")) {
    throw new Error("Email cannot contain consecutive dots.");
  }

  if (!/^[^\s@.][^\s@]*@[^\s@.-][^\s@]*\.[^\s@.]+$/.test(cleanedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  return cleanedEmail;
}

/*
 * Usernames are required in Earth In Sound accounts.
 * We trim accidental edge spaces, then reject empty values.
 */
function requireValidUsername(username: string): string {
  const cleanedUsername = username.trim();

  if (cleanedUsername.length === 0) {
    throw new Error("Username is required.");
  }

  return cleanedUsername;
}

/*
 * Keeps user search bounded. Empty searches return no results, and very large
 * requested limits are capped so an admin search cannot accidentally load the
 * full users table into the interface.
 */
function cleanSearchLimit(requestedLimit: number | undefined): number {
  if (requestedLimit === undefined) {
    return DEFAULT_SEARCH_LIMIT;
  }

  if (!Number.isFinite(requestedLimit)) {
    throw new Error("Search limit must be a finite number.");
  }

  return Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.round(requestedLimit)));
}

async function getUserById(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<UserDoc> {
  const user = await ctx.db.get(userId);

  if (!user) {
    throw new Error("User does not exist.");
  }

  return user;
}

async function getCurrentUserFromAuth(
  ctx: QueryCtx | MutationCtx,
): Promise<UserDoc | null> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
}

async function requireCurrentUser(ctx: QueryCtx | MutationCtx): Promise<UserDoc> {
  const currentUser = await getCurrentUserFromAuth(ctx);

  if (!currentUser) {
    throw new Error("You must be logged in with a linked Earth In Sound account.");
  }

  return currentUser;
}

function requireActiveUser(user: UserDoc): void {
  if (user.status !== "active") {
    throw new Error("This account is disabled.");
  }
}

function requireAdminUser(user: UserDoc): void {
  requireActiveUser(user);

  if (user.role !== "admin" && user.role !== "superadmin") {
    throw new Error("Admin access is required.");
  }
}

function requireSuperadminUser(user: UserDoc): void {
  requireActiveUser(user);

  if (user.role !== "superadmin") {
    throw new Error("Superadmin access is required.");
  }
}

async function requireUniqueUsername(
  ctx: QueryCtx | MutationCtx,
  username: string,
  currentUserId?: Id<"users">,
): Promise<void> {
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", username))
    .unique();

  if (existingUser && existingUser._id !== currentUserId) {
    throw new Error("Username is already in use.");
  }
}

async function countActiveSuperadmins(ctx: QueryCtx | MutationCtx): Promise<number> {
  const superadmins = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "superadmin"))
    .collect();

  return superadmins.filter((user) => user.status === "active").length;
}

async function requireSafeSuperadminChange(
  ctx: QueryCtx | MutationCtx,
  targetUser: UserDoc,
  nextRole?: UserRole,
  nextStatus = targetUser.status,
): Promise<void> {
  const roleWouldRemoveSuperadmin =
    nextRole !== undefined && nextRole !== "superadmin";
  const statusWouldRemoveSuperadmin = nextStatus !== "active";
  const wouldRemoveActiveSuperadmin =
    targetUser.role === "superadmin" &&
    targetUser.status === "active" &&
    (roleWouldRemoveSuperadmin || statusWouldRemoveSuperadmin);

  if (!wouldRemoveActiveSuperadmin) {
    return;
  }

  if ((await countActiveSuperadmins(ctx)) <= 1) {
    throw new Error("Cannot remove or disable the last active superadmin.");
  }
}

function compareUsersForAdminList(a: UserDoc, b: UserDoc): number {
  const usernameComparison = a.username.localeCompare(b.username, "en", {
    sensitivity: "base",
  });

  if (usernameComparison !== 0) {
    return usernameComparison;
  }

  return a.email.localeCompare(b.email, "en", { sensitivity: "base" });
}

/**
 * Creates the first superadmin user during setup.
 *
 * This is temporary development scaffolding. It only creates a superadmin when
 * no superadmin exists yet, so repeated dashboard tests cannot create multiple
 * full-power accounts by accident.
 */
export const createLocalSuperadmin = mutation({
  args: {
    email: v.string(),
    username: v.string(),
  },

  handler: async (ctx, args) => {
    const cleanedEmail = requireValidEmail(args.email);
    const cleanedUsername = requireValidUsername(args.username);

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", cleanedEmail))
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    const existingSuperadmins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "superadmin"))
      .take(1);

    if (existingSuperadmins.length > 0) {
      throw new Error("A setup superadmin already exists.");
    }

    await requireUniqueUsername(ctx, cleanedUsername);

    const now = Date.now();

    return await ctx.db.insert("users", {
      email: cleanedEmail,
      username: cleanedUsername,
      role: "superadmin",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Returns the Convex user linked to the current Clerk session.
 *
 * Before Clerk is connected this usually returns null, which is expected.
 */
export const getCurrentUser = query({
  args: {},

  handler: async (ctx) => {
    return await getCurrentUserFromAuth(ctx);
  },
});

/**
 * Finds one user by exact email.
 *
 * This is admin-only because email lookup reveals account information.
 */
export const getUserByEmail = query({
  args: {
    email: v.string(),
  },

  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx);
    requireAdminUser(currentUser);

    const cleanedEmail = requireValidEmail(args.email);

    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", cleanedEmail))
      .unique();
  },
});

/**
 * Lets the logged-in user change their own username.
 *
 * Admin renaming should be a separate future function, because changing another
 * person's public identity is a different permission than editing yourself.
 */
export const updateUsername = mutation({
  args: {
    username: v.string(),
  },

  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx);
    requireActiveUser(currentUser);

    const cleanedUsername = requireValidUsername(args.username);

    if (cleanedUsername === currentUser.username) {
      return currentUser._id;
    }

    await requireUniqueUsername(ctx, cleanedUsername, currentUser._id);

    await ctx.db.patch(currentUser._id, {
      username: cleanedUsername,
      updatedAt: Date.now(),
    });

    return currentUser._id;
  },
});

/**
 * Disables a user account without deleting its history.
 *
 * Users can close their own accounts. Admins can close themselves and regular
 * users. Superadmins can close themselves, admins, and regular users. The final
 * active superadmin is protected so the admin system cannot lock itself out.
 */
export const disableUser = mutation({
  args: {
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx);
    requireActiveUser(currentUser);

    const targetUser = await getUserById(ctx, args.userId);
    const isClosingOwnAccount = currentUser._id === targetUser._id;

    if (!isClosingOwnAccount) {
      if (currentUser.role === "user") {
        throw new Error("Users can only disable their own accounts.");
      }

      if (currentUser.role === "admin" && targetUser.role !== "user") {
        throw new Error("Admins can only disable regular user accounts.");
      }

      if (currentUser.role === "superadmin" && targetUser.role === "superadmin") {
        throw new Error("Superadmins cannot disable other superadmins here.");
      }
    }

    await requireSafeSuperadminChange(ctx, targetUser, undefined, "disabled");

    if (targetUser.status === "disabled") {
      return targetUser._id;
    }

    await ctx.db.patch(targetUser._id, {
      status: "disabled",
      updatedAt: Date.now(),
    });

    return targetUser._id;
  },
});

/**
 * Changes a user's permission role.
 *
 * Only active superadmins can change roles. The mutation prevents self-demotion
 * and protects the final active superadmin from being removed by mistake.
 */
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("superadmin"), v.literal("admin"), v.literal("user")),
  },

  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx);
    requireSuperadminUser(currentUser);

    if (currentUser._id === args.userId) {
      throw new Error("You cannot change your own role.");
    }

    const targetUser = await getUserById(ctx, args.userId);

    await requireSafeSuperadminChange(ctx, targetUser, args.role);

    if (targetUser.role === args.role) {
      return targetUser._id;
    }

    await ctx.db.patch(targetUser._id, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return targetUser._id;
  },
});

/**
 * Searches users by the beginning of their username or email.
 *
 * Stored casing is preserved. Lowercase copies are used only for comparison,
 * so searching "a", "A", or "AND" can still find "Andreea" and "Andrew".
 */
export const searchUsers = query({
  args: {
    searchText: v.string(),
    limit: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const currentUser = await requireCurrentUser(ctx);
    requireAdminUser(currentUser);

    const cleanedSearchText = args.searchText.trim().toLowerCase();

    if (cleanedSearchText.length === 0) {
      return [];
    }

    const searchLimit = cleanSearchLimit(args.limit);

    const [emailMatches, usernameMatches] = await Promise.all([
      ctx.db
        .query("users")
        .withSearchIndex("search_email", (q) => q.search("email", cleanedSearchText))
        .take(searchLimit),
      ctx.db
        .query("users")
        .withSearchIndex("search_username", (q) =>
          q.search("username", cleanedSearchText),
        )
        .take(searchLimit),
    ]);

    const usersById = new Map<Id<"users">, UserDoc>();

    for (const user of [...usernameMatches, ...emailMatches]) {
      const emailForSearch = user.email.toLowerCase();
      const usernameForSearch = user.username.toLowerCase();

      if (
        emailForSearch.startsWith(cleanedSearchText) ||
        usernameForSearch.startsWith(cleanedSearchText)
      ) {
        usersById.set(user._id, user);
      }
    }

    return [...usersById.values()]
      .sort(compareUsersForAdminList)
      .slice(0, searchLimit);
  },
});

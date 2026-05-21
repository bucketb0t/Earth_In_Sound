import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

// Local aliases keep this file readable while staying tied to the schema.
type UserDoc = Doc<"users">;

// Search defaults protect the admin panel from loading too many users at once.
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

  // Reject empty or all-space email input before any database lookup happens.
  if (cleanedEmail.length === 0) {
    throw new Error("Email is required.");
  }

  // Any internal whitespace means the email was mistyped.
  if (/\s/.test(cleanedEmail)) {
    throw new Error("Email cannot contain spaces.");
  }

  // Consecutive dots are an obvious malformed-email case.
  if (cleanedEmail.includes("..")) {
    throw new Error("Email cannot contain consecutive dots.");
  }

  // Basic shape check only; Clerk will later verify real email ownership.
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

  // Username is required, so blank input cannot be stored.
  if (cleanedUsername.length === 0) {
    throw new Error("Username is required.");
  }

  // Prevent usernames made only from ".", "_", or "-".
  if (!/[A-Za-z0-9]/.test(cleanedUsername)) {
    throw new Error("Username must contain at least one letter or number.");
  }

  // Keep usernames simple, display-safe, and URL-safe.
  if (!/^[A-Za-z0-9._-]+$/.test(cleanedUsername)) {
    throw new Error(
      'Username can only contain letters, numbers, ".", "-", and "_".',
    );
  }

  // Special username characters must be separated by letters or numbers.
  if (/[._-]{2,}/.test(cleanedUsername)) {
    throw new Error(
      'Username cannot place ".", "_", or "-" next to each other.',
    );
  }

  return cleanedUsername;
}

/*
 * Keeps user search bounded. Empty searches return no results, and very large
 * requested limits are capped so an admin search cannot accidentally load the
 * full users table into the interface.
 */
function cleanSearchLimit(requestedLimit: number | undefined): number {
  // No caller-provided limit means we use the normal admin search page size.
  if (requestedLimit === undefined) {
    return DEFAULT_SEARCH_LIMIT;
  }

  // JavaScript allows NaN/Infinity as numbers; search limits should not.
  if (!Number.isFinite(requestedLimit)) {
    throw new Error("Search limit must be a finite number.");
  }

  // Round partial limits and clamp them into the accepted range.
  return Math.max(1, Math.min(MAX_SEARCH_LIMIT, Math.round(requestedLimit)));
}

/*
 * Loads a specific user by Convex id.
 * Mutations use this when an admin chooses a target account.
 */
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

/*
 * Converts the current Clerk session into a Convex user document.
 * Clerk proves identity; Convex stores role, status, and site-specific data.
 */
async function getCurrentUserFromAuth(
  ctx: QueryCtx | MutationCtx,
): Promise<UserDoc | null> {
  const identity = await ctx.auth.getUserIdentity();

  // No Clerk identity means no logged-in website user.
  if (!identity) {
    return null;
  }

  // identity.subject is Clerk's stable user id; we store it as clerkUserId.
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
}

/*
 * Protected functions use this stricter helper.
 * Instead of returning null, it stops the function with a clear error.
 */
async function requireCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<UserDoc> {
  const currentUser = await getCurrentUserFromAuth(ctx);

  if (!currentUser) {
    throw new Error(
      "You must be logged in with a linked Earth In Sound account.",
    );
  }

  return currentUser;
}

// Disabled accounts remain in the database but cannot perform protected actions.
function requireActiveUser(user: UserDoc): void {
  if (user.status !== "active") {
    throw new Error("This account is disabled.");
  }
}

// Admin-level access includes admins and the owner.
function requireAdminUser(user: UserDoc): void {
  requireActiveUser(user);

  if (user.role !== "admin" && user.role !== "owner") {
    throw new Error("Admin access is required.");
  }
}

// Owner-only actions are the highest-risk account operations.
function requireOwnerUser(user: UserDoc): void {
  requireActiveUser(user);

  if (user.role !== "owner") {
    throw new Error("Owner access is required.");
  }
}

/*
 * Prevents duplicate usernames.
 * currentUserId lets a user keep their own existing username during edits.
 */
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

// Loads the owner account, if one exists.
async function getExistingOwner(
  ctx: QueryCtx | MutationCtx,
): Promise<UserDoc | null> {
  const owners = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "owner"))
    .collect();

  if (owners.length > 1) {
    throw new Error("Database has more than one owner account.");
  }

  return owners[0] ?? null;
}

/*
 * Protects the single owner account.
 * The owner role may move only through transferOwnership.
 */
function requireNotOwnerTarget(targetUser: UserDoc): void {
  if (targetUser.role !== "owner") {
    return;
  }

  throw new Error("Transfer ownership before changing the owner account.");
}

// Sorts admin search results by username first, then email as a tie-breaker.
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
 * Creates or repairs the single local owner during setup.
 *
 * This is temporary development scaffolding until Clerk is wired in. It allows
 * the first account to become owner, and it can repair the old local setup
 * record by turning it into the owner when no owner exists yet.
 */
export const createLocalOwner = mutation({
  args: {
    email: v.string(),
    username: v.string(),
  },

  handler: async (ctx, args) => {
    // Validate setup input before checking or writing to the database.
    const cleanedEmail = requireValidEmail(args.email);
    const cleanedUsername = requireValidUsername(args.username);

    const existingOwner = await getExistingOwner(ctx);

    // If an owner already exists, setup is finished and ownership must transfer.
    if (existingOwner) {
      if (existingOwner.email === cleanedEmail) {
        return existingOwner._id;
      }

      throw new Error("An owner already exists. Transfer ownership instead.");
    }

    /*
     * If this email exists from earlier setup, promote that exact account to
     * owner instead of creating a duplicate user document.
     */
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", cleanedEmail))
      .unique();

    if (existingUser) {
      await requireUniqueUsername(ctx, cleanedUsername, existingUser._id);

      await ctx.db.patch(existingUser._id, {
        username: cleanedUsername,
        role: "owner",
        status: "active",
        updatedAt: Date.now(),
      });

      return existingUser._id;
    }

    await requireUniqueUsername(ctx, cleanedUsername);

    // Store both timestamps now; future edits only update updatedAt.
    const now = Date.now();

    return await ctx.db.insert("users", {
      email: cleanedEmail,
      username: cleanedUsername,
      role: "owner",
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
    // The frontend can use this to know who is currently logged in.
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
    // Email lookup exposes account data, so it is admin-only.
    const currentUser = await requireCurrentUser(ctx);
    requireAdminUser(currentUser);

    // Validate the lookup email the same way we validate stored emails.
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
    // Users can rename themselves only while their account is active.
    const currentUser = await requireCurrentUser(ctx);
    requireActiveUser(currentUser);

    const cleanedUsername = requireValidUsername(args.username);

    // No change means no database write and no updatedAt change.
    if (cleanedUsername === currentUser.username) {
      return currentUser._id;
    }

    // The new username must not belong to anyone else.
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
 * users. The owner can close admins and users, but not the owner account;
 * ownership must be transferred first so the site never loses its owner.
 */
export const disableUser = mutation({
  args: {
    userId: v.id("users"),
  },

  handler: async (ctx, args) => {
    // A disabled account cannot disable any account.
    const currentUser = await requireCurrentUser(ctx);
    requireActiveUser(currentUser);

    const targetUser = await getUserById(ctx, args.userId);
    const isClosingOwnAccount = currentUser._id === targetUser._id;

    // The owner account can only be removed after ownership is transferred.
    requireNotOwnerTarget(targetUser);

    // Self-closing is allowed; closing another account depends on role.
    if (!isClosingOwnAccount) {
      if (currentUser.role === "user") {
        throw new Error("Users can only disable their own accounts.");
      }

      if (currentUser.role === "admin" && targetUser.role !== "user") {
        throw new Error("Admins can only disable regular user accounts.");
      }
    }

    // Re-running the same disable action should not cause an error.
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
 * Only the owner can promote/demote admins and normal users. The owner role is
 * intentionally excluded here because ownership moves through transferOwnership.
 */
export const setUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },

  handler: async (ctx, args) => {
    // Role edits are reserved for the active owner.
    const currentUser = await requireCurrentUser(ctx);
    requireOwnerUser(currentUser);

    const targetUser = await getUserById(ctx, args.userId);

    // Owner changes are blocked here so ownership has one clear path.
    requireNotOwnerTarget(targetUser);

    // If the role is already correct, avoid a pointless write.
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
 * Transfers the single owner role to another active user.
 *
 * The current owner becomes an admin. That keeps the old owner useful without
 * leaving two owner accounts in the database.
 */
export const transferOwnership = mutation({
  args: {
    newOwnerUserId: v.id("users"),
  },

  handler: async (ctx, args) => {
    const currentOwner = await requireCurrentUser(ctx);
    requireOwnerUser(currentOwner);

    const nextOwner = await getUserById(ctx, args.newOwnerUserId);
    requireActiveUser(nextOwner);

    if (currentOwner._id === nextOwner._id) {
      return currentOwner._id;
    }

    const now = Date.now();

    /*
     * Convex mutations are transactional. Both role changes commit together,
     * so the database never ends a mutation with zero or two owners.
     */
    await ctx.db.patch(currentOwner._id, {
      role: "admin",
      updatedAt: now,
    });

    await ctx.db.patch(nextOwner._id, {
      role: "owner",
      updatedAt: now,
    });

    return nextOwner._id;
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
    // Searching users exposes account data, so it is admin-only.
    const currentUser = await requireCurrentUser(ctx);
    requireAdminUser(currentUser);

    // Lowercase is used only for comparison, never for storing/displaying.
    const cleanedSearchText = args.searchText.trim().toLowerCase();

    if (cleanedSearchText.length === 0) {
      return [];
    }

    const searchLimit = cleanSearchLimit(args.limit);

    // Search email and username separately because each has its own index.
    const [emailMatches, usernameMatches] = await Promise.all([
      ctx.db
        .query("users")
        .withSearchIndex("search_email", (q) =>
          q.search("email", cleanedSearchText),
        )
        .take(searchLimit),
      ctx.db
        .query("users")
        .withSearchIndex("search_username", (q) =>
          q.search("username", cleanedSearchText),
        )
        .take(searchLimit),
    ]);

    // A user can match both searches, so Map removes duplicates by user id.
    const usersById = new Map<Id<"users">, UserDoc>();

    for (const user of [...usernameMatches, ...emailMatches]) {
      // These temporary lowercase copies do not modify the stored user values.
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

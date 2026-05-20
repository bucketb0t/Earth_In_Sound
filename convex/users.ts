import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

/**
 * Creates the first superadmin user during setup.
 *
 * This is temporary development scaffolding. Later, when Clerk is connected,
 * superadmin creation should be protected and linked to your real Clerk user id.
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
 * Finds one user by email.
 *
 * Useful while we are still local-only and do not have Clerk connected.
 */
export const getUserByEmail = query({
  args: {
    email: v.string(),
  },

  handler: async (ctx, args) => {
    const cleanedEmail = requireValidEmail(args.email);

    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", cleanedEmail))
      .unique();
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
  },

  handler: async (ctx, args) => {
    const cleanedSearchText = args.searchText.trim().toLowerCase();

    if (cleanedSearchText.length === 0) {
      return [];
    }

    const users = await ctx.db.query("users").collect();

    return users.filter((user) => {
      const emailForSearch = user.email.toLowerCase();
      const usernameForSearch = user.username.toLowerCase();

      return (
        emailForSearch.startsWith(cleanedSearchText) ||
        usernameForSearch.startsWith(cleanedSearchText)
      );
    });
  },
});

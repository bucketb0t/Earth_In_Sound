import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Creates the first superadmin user during local setup.
 *
 * This is temporary development scaffolding.
 * Later, when Clerk is connected, superadmin creation should be protected
 * and linked to your real Clerk user id.
 */
export const createLocalSuperadmin = mutation({
  args: {
    email: v.string(),
    username: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      return existingUser._id;
    }

    const now = Date.now();

    return await ctx.db.insert("users", {
      email: args.email,
      username: args.username,
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
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});
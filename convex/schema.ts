import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Database structure for Earth In Sound.
 *
 * Convex stores website/account data here.
 * Authentication/passwords will be handled later by Clerk.
 */
export default defineSchema({
  users: defineTable({
    /**
     * Future secure link to Clerk.
     * Optional for now because we are starting with local Convex only.
     */
    clerkUserId: v.optional(v.string()),

    /**
     * User email.
     * Useful for local setup and admin display.
     */
    email: v.string(),

    /**
     * Public/admin display name.
     */
    username: v.optional(v.string()),

    /**
     * Website permission role.
     */
    role: v.union(
      v.literal("superadmin"),
      v.literal("admin"),
      v.literal("user"),
    ),

    /**
     * Account state.
     * Disabled users stay stored but should be blocked from protected actions.
     */
    status: v.union(v.literal("active"), v.literal("disabled")),

    /**
     * Date timestamps stored as Date.now() numbers.
     */
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_role", ["role"]),
});
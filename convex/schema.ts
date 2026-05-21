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
     * Required public/admin display name.
     */
    username: v.string(),

    /**
     * Website permission role.
     *
     * owner: the single top account; ownership is transferred, not duplicated.
     * admin: can moderate/manage normal users but cannot change roles.
     * user: normal public account.
     */
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("user")),

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
    .index("by_username", ["username"])
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_role", ["role"])
    .searchIndex("search_email", {
      searchField: "email",
    })
    .searchIndex("search_username", {
      searchField: "username",
    }),
});

import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, sensitiveSessionMiddleware } from "better-auth/api";
import { deleteSessionCookie, setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { getUserByAuthProviderId } from "@/backend/database/users/read/read-users";
import { deleteUser, updateUsername } from "@/backend/database/users/write/write-users";
import { requireValidUsername } from "@/backend/database/users/validation/validate-user-input";
import type { UserRole } from "@/backend/database/users/read/read-users";

export interface AccountProfile {
  username: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
}

async function requireAccountProfile(authUserId: string) {
  const profile = await getUserByAuthProviderId(authUserId);
  if (!profile || profile.status !== "active") {
    throw new APIError("FORBIDDEN", { message: "User account is not active." });
  }
  return profile;
}

/** Extend Better Auth so account endpoints share its origin, session, and rate checks. */
export function accountManagement() {
  return {
    id: "eis-account" as const,
    rateLimit: [{ pathMatcher: (path) => path === "/account/close", window: 300, max: 5 }],
    endpoints: {
      getAccountProfile: createAuthEndpoint("/account/profile", {
        method: "GET",
        use: [sensitiveSessionMiddleware],
      }, async (ctx) => {
        const profile = await requireAccountProfile(ctx.context.session.user.id);
        ctx.setHeader("Cache-Control", "no-store");
        return ctx.json<AccountProfile>({
          username: profile.username,
          email: profile.email,
          role: profile.role,
          emailVerified: ctx.context.session.user.emailVerified,
        });
      }),
      updateAccountUsername: createAuthEndpoint("/account/update-username", {
        method: "POST",
        body: z.object({ username: z.string().max(256) }).strict(),
        use: [sensitiveSessionMiddleware],
      }, async (ctx) => {
        const profile = await requireAccountProfile(ctx.context.session.user.id);
        let username: string;
        try {
          username = requireValidUsername(ctx.body.username);
        } catch (error) {
          throw new APIError("BAD_REQUEST", {
            message: error instanceof Error ? error.message : "Enter a valid username.",
          });
        }

        try {
          const updated = await updateUsername({ currentUserId: profile.id, username });
          await setSessionCookie(ctx, {
            session: ctx.context.session.session,
            user: { ...ctx.context.session.user, name: updated.username },
          });
          return ctx.json({ username: updated.username });
        } catch (error) {
          if (error instanceof Error && error.message === "Username is already registered.") {
            throw new APIError("BAD_REQUEST", { message: error.message });
          }
          if (error instanceof Error && error.message === "User account is not active.") {
            throw new APIError("FORBIDDEN", { message: error.message });
          }
          ctx.context.logger.error("Account username update failed.", error);
          throw new APIError("INTERNAL_SERVER_ERROR", { message: "Could not update username. Please try again." });
        }
      }),
      closeAccount: createAuthEndpoint("/account/close", {
        method: "POST",
        body: z.object({ currentPassword: z.string().min(1).max(128), confirmation: z.literal("DELETE") }).strict(),
        use: [sensitiveSessionMiddleware],
      }, async (ctx) => {
        const profile = await requireAccountProfile(ctx.context.session.user.id);
        if (profile.role === "owner") {
          throw new APIError("FORBIDDEN", { message: "Transfer ownership before deleting the owner account." });
        }

        const credential = await ctx.context.internalAdapter.findCredentialAccount(ctx.context.session.user.id);
        if (!credential?.password || !await ctx.context.password.verify({
          hash: credential.password,
          password: ctx.body.currentPassword,
        })) {
          throw new APIError("BAD_REQUEST", { message: "Invalid password" });
        }

        try {
          await deleteUser({ currentUserId: profile.id, targetUserId: profile.id });
        } catch (error) {
          ctx.context.logger.error("Account closure failed.", error);
          throw new APIError("INTERNAL_SERVER_ERROR", { message: "Could not close account. Please try again." });
        }
        deleteSessionCookie(ctx);
        return ctx.json({ status: true });
      }),
    },
  } satisfies BetterAuthPlugin;
}

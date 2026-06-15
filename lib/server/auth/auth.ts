import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";

import {
  createNormalUserAfterSignup,
  createOrLinkOwnerAfterSignup,
} from "@/lib/server/database/users/write/write-users";
import {
  getUserByAuthProviderId,
  getUserByEmail,
  getUserByUsername,
} from "@/lib/server/database/users/read/read-users";
import {
  requireValidEmail,
  requireValidUsername,
} from "@/lib/server/database/users/validation/validate-user-input";
import { betterAuthDatabase } from "./better-auth-database";
import { getOwnerSetupIdentity } from "./owner-setup-context";

const appBaseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

function isOwnerSetupIdentity(email: string, username: string): boolean {
  const ownerSetupIdentity = getOwnerSetupIdentity();

  return (
    ownerSetupIdentity !== null &&
    requireValidEmail(ownerSetupIdentity.email).toLowerCase() ===
      requireValidEmail(email).toLowerCase() &&
    requireValidUsername(ownerSetupIdentity.username).toLowerCase() ===
      requireValidUsername(username).toLowerCase()
  );
}

/**
 * Better Auth server configuration.
 * Passwords and sessions live in Better Auth tables; site roles live in users.
 *
 * This file is the center of the auth system. Requests arrive from
 * app/api/auth/[...all]/route.ts, Better Auth processes them here, then the
 * database hooks mirror successful signups into the project's users table.
 */
export const auth = betterAuth({
  appName: "Earth In Sound",
  baseURL: appBaseUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: {
    /*
     * Better Auth stores auth data in Turso through Kysely.
     * Snake casing keeps generated auth columns consistent with SQL style.
     */
    db: betterAuthDatabase,
    type: "sqlite",
    casing: "snake",
  },
  emailAndPassword: {
    /*
     * Email/password auth owns password hashing and session creation. The
     * project never manually stores or compares raw passwords. When a visitor
     * signs up or signs in, Better Auth handles the security-sensitive work.
     */
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  databaseHooks: {
    /*
     * Hooks keep Better Auth's auth user table and the project's users table
     * synchronized without allowing signup to choose roles.
     */
    user: {
      create: {
        /**
         * Validates signups before Better Auth writes its auth user.
         * Signup can only create normal accounts; roles are handled elsewhere.
         *
         * This hook is the "front gate" for new accounts:
         * 1. clean and validate the submitted email/username;
         * 2. check the project users table for duplicates;
         * 3. return cleaned data to Better Auth if everything is allowed.
         */
        before: async (user) => {
          const email = requireValidEmail(user.email);
          const username = requireValidUsername(String(user.name ?? ""));
          const isOwnerSetup = isOwnerSetupIdentity(email, username);
          const existingEmailUser = await getUserByEmail(email);

          if (
            existingEmailUser &&
            !(
              isOwnerSetup &&
              existingEmailUser.role === "owner" &&
              existingEmailUser.status === "active" &&
              existingEmailUser.auth_provider_user_id === null
            )
          ) {
            throw new Error("Email is already registered.");
          }

          const existingUsernameUser = await getUserByUsername(username);
          if (
            existingUsernameUser &&
            existingUsernameUser.id !== existingEmailUser?.id
          ) {
            throw new Error("Username is already registered.");
          }

          return {
            data: {
              ...user,
              email,
              name: username,
            },
          };
        },

        /**
         * Mirrors a verified auth signup into the project users table.
         * The inserted role is always "user".
         *
         * At this point Better Auth has already created its own auth user. The
         * app now creates the Earth In Sound profile row and stores the Better
         * Auth user.id in auth_provider_user_id so both systems stay linked.
         */
        after: async (user) => {
          const username = String(user.name ?? "");
          const createProjectUser = isOwnerSetupIdentity(user.email, username)
            ? createOrLinkOwnerAfterSignup
            : createNormalUserAfterSignup;

          await createProjectUser({
            authProviderUserId: user.id,
            email: user.email,
            username,
          });
        },
      },
    },
    session: {
      create: {
        /**
         * Disabled, deleted, or unmirrored accounts cannot create sessions.
         */
        before: async (session, context) => {
          const projectUser = await getUserByAuthProviderId(session.userId);

          if (
            !projectUser &&
            (context?.path === "/sign-up/email" || getOwnerSetupIdentity())
          ) {
            return;
          }

          if (!projectUser || projectUser.status !== "active") {
            throw new APIError("FORBIDDEN", {
              message: "User account is not active.",
            });
          }
        },
      },
    },
  },
  plugins: [nextCookies()],
});

import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { deleteAuthUser } from "./auth-user-lifecycle";

import {
  createNormalUserAfterSignup,
  createOrLinkOwnerAfterSignup,
} from "@/backend/database/users/write/write-users";
import {
  getUserByAuthProviderId,
  getUserByEmail,
  getUserByUsername,
} from "@/backend/database/users/read/read-users";
import {
  requireValidEmail,
  requireValidUsername,
} from "@/backend/database/users/validation/validate-user-input";
import { betterAuthDatabase } from "./better-auth-database";
import { getOwnerSetupIdentity } from "./owner-setup-context";

const appBaseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const shouldSilenceBetterAuthLogs =
  process.env.EIS_SILENCE_BETTER_AUTH_LOGS === "true";

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

/** Better Auth owns passwords and sessions; project users own roles and status. */
export const auth = betterAuth({
  appName: "Earth In Sound",
  baseURL: appBaseUrl,
  logger: {
    /* Silence expected auth failures in database tests only. */
    disabled: shouldSilenceBetterAuthLogs,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  database: {
    /* Shared transactions must match Better Auth's generated schema. */
    db: betterAuthDatabase,
    type: "sqlite",
    casing: "snake",
  },
  emailAndPassword: {
    /* Better Auth handles passwords and sessions; mailbox ownership is not yet verified. */
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  databaseHooks: {
    user: {
      create: {
        /** Validate and normalize signup input; enforce reserved identities before auth writes. */
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

        /** Link the auth user to a normal project profile; remove the auth user if linking fails. */
        after: async (user) => {
          const username = String(user.name ?? "");
          const createProjectUser = isOwnerSetupIdentity(user.email, username)
            ? createOrLinkOwnerAfterSignup
            : createNormalUserAfterSignup;

          try {
            await createProjectUser({
              authProviderUserId: user.id,
              email: user.email,
              username,
            });
          } catch (profileError) {
            try {
              await deleteAuthUser(user.id);
            } catch (cleanupError) {
              throw new AggregateError(
                [profileError, cleanupError],
                "Signup failed and the incomplete authentication account could not be removed.",
              );
            }

            throw profileError;
          }
        },
      },
    },
    session: {
      create: {
        /** Reject sessions for inactive or missing profiles, except during signup and trusted owner setup. */
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

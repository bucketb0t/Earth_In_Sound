import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import type { UserReader } from "@/backend/database/users/read/read-users";
import type { UserWriter } from "@/backend/database/users/write/write-users";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  requireValidPassword,
} from "@/shared/account-policy";
import {
  requireValidEmail,
  requireValidUsername,
} from "@/backend/database/users/validation/validate-user-input";
import { createAccountManagement } from "./account-management";
import type { OwnerSetupContext } from "@/backend/ownership/owner-setup-context";

type AuthenticationDatabase = NonNullable<
  Parameters<typeof betterAuth>[0]["database"]
>;

export interface AuthenticationConfiguration {
  appName: string;
  baseUrl: string;
  secret: string;
  silenceLogs: boolean;
}

export interface AuthenticationDependencies {
  configuration: AuthenticationConfiguration;
  database: AuthenticationDatabase;
  ownerSetupContext: OwnerSetupContext;
  userReader: Pick<
    UserReader,
    "getUserByAuthProviderId" | "getUserByEmail" | "getUserByUsername"
  >;
  userWriter: Pick<
    UserWriter,
    | "createNormalUserAfterSignup"
    | "createOrLinkOwnerAfterSignup"
    | "deleteUser"
    | "updateUsername"
  >;
}

/** Build Better Auth from explicit configuration and project account capabilities. */
export function createAuthentication(dependencies: AuthenticationDependencies) {
  const { configuration, database, ownerSetupContext, userReader, userWriter } =
    dependencies;
  let deleteCreatedAuthUser: ((authUserId: string) => Promise<void>) | null =
    null;

  function isOwnerSetupIdentity(email: string, username: string): boolean {
    const ownerSetupIdentity = ownerSetupContext.getIdentity();

    return (
      ownerSetupIdentity !== null &&
      requireValidEmail(ownerSetupIdentity.email).toLowerCase() ===
        requireValidEmail(email).toLowerCase() &&
      requireValidUsername(ownerSetupIdentity.username).toLowerCase() ===
        requireValidUsername(username).toLowerCase()
    );
  }

  const authentication = betterAuth({
    appName: configuration.appName,
    baseURL: configuration.baseUrl,
    disabledPaths: ["/update-user", "/delete-user"],
    logger: {
      disabled: configuration.silenceLogs,
    },
    secret: configuration.secret,
    database,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      autoSignIn: true,
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        const password =
          context.path === "/sign-up/email"
            ? context.body?.password
            : context.path === "/change-password" ||
                context.path === "/reset-password"
              ? context.body?.newPassword
              : undefined;

        if (typeof password !== "string") {
          return;
        }

        try {
          requireValidPassword(password);
        } catch (error) {
          throw new APIError("BAD_REQUEST", {
            message:
              error instanceof Error
                ? error.message
                : "Enter a valid password.",
          });
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const email = requireValidEmail(user.email);
            const username = requireValidUsername(String(user.name ?? ""));
            const isOwnerSetup = isOwnerSetupIdentity(email, username);
            const existingEmailUser = await userReader.getUserByEmail(email);

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

            const existingUsernameUser =
              await userReader.getUserByUsername(username);
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
          after: async (user) => {
            const username = String(user.name ?? "");
            const createProjectUser = isOwnerSetupIdentity(user.email, username)
              ? userWriter.createOrLinkOwnerAfterSignup
              : userWriter.createNormalUserAfterSignup;

            try {
              await createProjectUser({
                authProviderUserId: user.id,
                email: user.email,
                username,
              });
            } catch (profileError) {
              if (!deleteCreatedAuthUser) {
                throw new AggregateError(
                  [profileError],
                  "Signup failed before authentication cleanup was available.",
                );
              }

              try {
                await deleteCreatedAuthUser(user.id);
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
          before: async (session, context) => {
            const projectUser = await userReader.getUserByAuthProviderId(
              session.userId,
            );

            if (
              !projectUser &&
              (context?.path === "/sign-up/email" ||
                ownerSetupContext.getIdentity())
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
    plugins: [
      createAccountManagement({ userReader, userWriter }),
      nextCookies(),
    ],
  });

  deleteCreatedAuthUser = async (authUserId) => {
    const context = await authentication.$context;
    await context.internalAdapter.deleteUser(authUserId);
  };

  return authentication;
}

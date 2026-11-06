import type { BetterAuthPlugin } from "better-auth";
import { z } from "zod";

import {
  APIError,
  createAuthEndpoint,
  sensitiveSessionMiddleware,
} from "better-auth/api";

import type {
  StoredUser,
  UserReader,
  UserRole,
  UserStatus,
} from "@/backend/database/users/read/read-users";
import type { UserWriter } from "@/backend/database/users/write/write-users";

export interface AdministrativeUserSummary {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  authenticationLinked: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AdministrationManagementDependencies {
  userReader: Pick<UserReader, "getUserByAuthProviderId" | "searchUsers">;
  userWriter: Pick<
    UserWriter,
    "disableUser" | "reactivateUser" | "setUserRole" | "transferOwnership"
  >;
}

/** Require an active owner or administrator account. */
export async function requireAdministrativeUser(
  userReader: Pick<UserReader, "getUserByAuthProviderId">,
  authProviderUserId: string,
): Promise<StoredUser> {
  const currentUser =
    await userReader.getUserByAuthProviderId(authProviderUserId);

  if (
    !currentUser ||
    currentUser.status !== "active" ||
    currentUser.role === "user"
  ) {
    throw new APIError("FORBIDDEN", {
      message: "Administrator access is required.",
    });
  }

  return currentUser;
}

/** Expose only the account information needed by administrators. */
export function toAdministrativeUserSummary(
  user: StoredUser,
): AdministrativeUserSummary {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    authenticationLinked: user.auth_provider_user_id !== null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

/** Create protected administrative account endpoints. */
export function createAdministrationManagement(
  dependencies: AdministrationManagementDependencies,
) {
  const { userReader, userWriter } = dependencies;

  return {
    id: "project-administration" as const,

    rateLimit: [
      {
        pathMatcher: (path) => path === "/administration/users/search",
        window: 60,
        max: 30,
      },
      {
        pathMatcher: (path) => path === "/administration/users/status",
        window: 60,
        max: 10,
      },
    ],

    endpoints: {
      searchAdministrativeUsers: createAuthEndpoint(
        "/administration/users/search",
        {
          method: "POST",
          body: z
            .object({
              searchText: z.string().min(1).max(320),
              limit: z.number().int().min(1).max(50).optional(),
            })
            .strict(),
          use: [sensitiveSessionMiddleware],
        },
        async (context) => {
          await requireAdministrativeUser(
            userReader,
            context.context.session.user.id,
          );

          const users = await userReader.searchUsers({
            searchText: context.body.searchText,
            limit: context.body.limit,
          });

          context.setHeader("Cache-Control", "no-store");

          return context.json({
            users: users.map(toAdministrativeUserSummary),
          });
        },
      ),

      updateAdministrativeUserStatus: createAuthEndpoint(
        "/administration/users/status",
        {
          method: "POST",
          body: z
            .object({
              targetUserId: z.string().min(1).max(128),
              status: z.enum(["active", "disabled"]),
            })
            .strict(),
          use: [sensitiveSessionMiddleware],
        },
        async (context) => {
          const currentUser = await requireAdministrativeUser(
            userReader,
            context.context.session.user.id,
          );

          if (currentUser.id === context.body.targetUserId) {
            throw new APIError("BAD_REQUEST", {
              message: "You cannot change your own status here.",
            });
          }

          try {
            const updatedUser =
              context.body.status === "disabled"
                ? await userWriter.disableUser({
                    currentUserId: currentUser.id,
                    targetUserId: context.body.targetUserId,
                  })
                : await userWriter.reactivateUser({
                    currentUserId: currentUser.id,
                    targetUserId: context.body.targetUserId,
                  });

            context.setHeader("Cache-Control", "no-store");

            return context.json({
              user: toAdministrativeUserSummary(updatedUser),
            });
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === "Target user was not found."
            ) {
              throw new APIError("NOT_FOUND", {
                message: error.message,
              });
            }

            if (
              error instanceof Error &&
              (error.message === "Current user was not found." ||
                error.message === "User account is not active." ||
                error.message ===
                  "You do not have permission to manage this user.")
            ) {
              throw new APIError("FORBIDDEN", {
                message:
                  error.message ===
                  "You do not have permission to manage this user."
                    ? error.message
                    : "Administrator access is required.",
              });
            }

            if (
              error instanceof Error &&
              (error.message === "Deleted users cannot be disabled." ||
                error.message === "Only active users can be disabled." ||
                error.message === "Only disabled users can be reactivated.")
            ) {
              throw new APIError("BAD_REQUEST", {
                message: error.message,
              });
            }

            context.context.logger.error(
              "Administrative user status update failed.",
              error,
            );

            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Could not update the user status. Please try again.",
            });
          }
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}

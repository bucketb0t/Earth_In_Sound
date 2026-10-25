import type { BetterAuthClientPlugin } from "better-auth";
import type { createAccountManagement } from "@/backend/authentication/account-management";

export function accountClient() {
  return {
    id: "project-account" as const,
    $InferServerPlugin: {} as ReturnType<typeof createAccountManagement>,
    atomListeners: [
      {
        matcher: (path) =>
          path === "/sign-in/identifier" ||
          path === "/account/update-username" ||
          path === "/account/close",
        signal: "$sessionSignal",
      },
    ],
  } satisfies BetterAuthClientPlugin;
}

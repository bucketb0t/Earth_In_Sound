import type { BetterAuthClientPlugin } from "better-auth";
import type { accountManagement } from "@/backend/authentication/account-management";

export function accountClient() {
  return {
    id: "eis-account" as const,
    $InferServerPlugin: {} as ReturnType<typeof accountManagement>,
    atomListeners: [
      {
        matcher: (path) =>
          path === "/account/update-username" || path === "/account/close",
        signal: "$sessionSignal",
      },
    ],
  } satisfies BetterAuthClientPlugin;
}

import { requireValidPassword } from "@/shared/account-policy";
import {
  requireValidEmail,
  requireValidUsername,
} from "@/backend/database/users/validation/validate-user-input";

export interface OwnerSetupEnvironment {
  LOCAL_OWNER_EMAIL?: string;
  LOCAL_OWNER_USERNAME?: string;
  LOCAL_OWNER_PASSWORD?: string;
}

export interface OwnerSetupConfiguration {
  email: string;
  username: string;
  password: string;
}

/** Read an optional but all-or-nothing owner bootstrap configuration. */
export function readOwnerSetupConfiguration(
  environment: OwnerSetupEnvironment,
): OwnerSetupConfiguration | null {
  const email = environment.LOCAL_OWNER_EMAIL?.trim();
  const username = environment.LOCAL_OWNER_USERNAME?.trim();
  const password = environment.LOCAL_OWNER_PASSWORD;
  const passwordIsMissing = !password || password.trim().length === 0;

  if (!email && !username && passwordIsMissing) {
    return null;
  }

  if (!email || !username || passwordIsMissing) {
    throw new Error(
      "LOCAL_OWNER_EMAIL, LOCAL_OWNER_USERNAME, and LOCAL_OWNER_PASSWORD must either all be provided or all be omitted.",
    );
  }

  return Object.freeze({
    email: requireValidEmail(email),
    username: requireValidUsername(username),
    password: requireValidPassword(password, "LOCAL_OWNER_PASSWORD"),
  });
}

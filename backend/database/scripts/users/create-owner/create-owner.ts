import { loadEnvConfig } from "@next/env";
import { pathToFileURL } from "node:url";
import { requireValidPassword } from "@/shared/account-policy";
import {
  requireValidEmail,
  requireValidUsername,
} from "@/backend/database/users/validation/validate-user-input";

type OwnerSetupEnvironment = Partial<NodeJS.ProcessEnv> & {
  LOCAL_OWNER_EMAIL?: string;
  LOCAL_OWNER_USERNAME?: string;
  LOCAL_OWNER_PASSWORD?: string;
};

interface OwnerSetupConfiguration {
  email: string;
  username: string;
  password: string;
}

export function readOwnerSetupConfiguration(
  environment: OwnerSetupEnvironment = process.env,
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

  return {
    email: requireValidEmail(email),
    username: requireValidUsername(username),
    password: requireValidPassword(password, "LOCAL_OWNER_PASSWORD"),
  };
}

/**
 * Create or repair the first owner using trusted LOCAL_OWNER_* inputs.
 * Revoke setup sessions so the owner must sign in normally afterward.
 */
export async function runCreateOwnerScript(): Promise<void> {
  loadEnvConfig(process.cwd());
  const ownerConfiguration = readOwnerSetupConfiguration();

  if (ownerConfiguration === null) {
    console.log(
      "No LOCAL_OWNER_* configuration was provided. Skipping owner creation.",
    );
    return;
  }

  const {
    email: ownerEmail,
    username: ownerUsername,
    password: ownerPassword,
  } = ownerConfiguration;

  const [{ auth }, { runWithOwnerSetupContext }, userReads, userWrites] =
    await Promise.all([
      import("../../../../authentication/auth"),
      import("../../../../authentication/owner-setup-context"),
      import("../../../users/read/read-users"),
      import("../../../users/write/write-users"),
    ]);

  const existingOwner = await userReads.getOwner();
  const authContext = await auth.$context;

  if (existingOwner?.auth_provider_user_id) {
    const authUser = await authContext.internalAdapter.findUserById(
      existingOwner.auth_provider_user_id,
    );

    if (!authUser) {
      throw new Error(
        "The owner profile points to a missing Better Auth account.",
      );
    }

    console.log("Owner already exists and is linked. Skipping owner creation.");
    return;
  }

  const existingAuthRecord =
    await authContext.internalAdapter.findUserByEmail(ownerEmail);

  const ownerAuthUserId = await runWithOwnerSetupContext(
    { email: ownerEmail, username: ownerUsername },
    async () => {
      if (existingAuthRecord?.user) {
        await auth.api.signInEmail({
          body: {
            email: ownerEmail,
            password: ownerPassword,
          },
        });

        await userWrites.createOrLinkOwnerAfterSignup({
          authProviderUserId: existingAuthRecord.user.id,
          email: ownerEmail,
          username: ownerUsername,
        });

        return existingAuthRecord.user.id;
      }

      const signupResult = await auth.api.signUpEmail({
        body: {
          email: ownerEmail,
          name: ownerUsername,
          password: ownerPassword,
        },
      });

      return signupResult.user.id;
    },
  );

  await authContext.internalAdapter.deleteUserSessions(ownerAuthUserId);

  const owner = await userReads.getOwner();
  console.log("Owner account is ready.");
  console.log({
    id: owner?.id,
    email: owner?.email,
    username: owner?.username,
    role: owner?.role,
    status: owner?.status,
    authLinked: owner?.auth_provider_user_id === ownerAuthUserId,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCreateOwnerScript().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

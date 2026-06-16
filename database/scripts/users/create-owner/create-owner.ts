import { loadEnvConfig } from "@next/env";
import { pathToFileURL } from "node:url";

loadEnvConfig(process.cwd());

/**
 * Creates or repairs the first owner through Better Auth.
 *
 * LOCAL_OWNER_* values are trusted terminal-only setup inputs. The script
 * signs up or signs in with Better Auth, links the project owner row, then
 * removes setup-created sessions so the owner must log in normally afterward.
 */
export async function runCreateOwnerScript(): Promise<void> {
  const ownerEmail = process.env.LOCAL_OWNER_EMAIL?.trim();
  const ownerUsername = process.env.LOCAL_OWNER_USERNAME?.trim();
  const ownerPassword = process.env.LOCAL_OWNER_PASSWORD;

  if (!ownerEmail || !ownerUsername || !ownerPassword) {
    console.log(
      "LOCAL_OWNER_EMAIL, LOCAL_OWNER_USERNAME, or LOCAL_OWNER_PASSWORD is missing. Skipping owner creation.",
    );
    return;
  }

  const [{ auth }, { runWithOwnerSetupContext }, userReads, userWrites] =
    await Promise.all([
      import("../../../../lib/server/auth/auth"),
      import("../../../../lib/server/auth/owner-setup-context"),
      import("../../../../lib/server/database/users/read/read-users"),
      import("../../../../lib/server/database/users/write/write-users"),
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

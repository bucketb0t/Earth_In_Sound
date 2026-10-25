import { loadEnvConfig } from "@next/env";
import { pathToFileURL } from "node:url";
import { readOwnerSetupConfiguration } from "@/backend/ownership/owner-setup-configuration";
import { setupOwner } from "@/backend/ownership/setup-owner";

/** Load deployment inputs and run the reusable owner bootstrap use case. */
export async function runCreateOwnerScript(): Promise<void> {
  loadEnvConfig(process.cwd());

  const configuration = readOwnerSetupConfiguration({
    LOCAL_OWNER_EMAIL: process.env.LOCAL_OWNER_EMAIL,
    LOCAL_OWNER_USERNAME: process.env.LOCAL_OWNER_USERNAME,
    LOCAL_OWNER_PASSWORD: process.env.LOCAL_OWNER_PASSWORD,
  });

  if (configuration === null) {
    console.log(
      "No LOCAL_OWNER_* configuration was provided. Skipping owner creation.",
    );
    return;
  }

  const [{ auth }, { ownerSetupContext }, { userReader, userWriter }] =
    await Promise.all([
      import("../../../../authentication/auth"),
      import("../../../../ownership/owner-setup-context"),
      import("../../../users/user-module"),
    ]);
  const authContext = await auth.$context;
  const result = await setupOwner(configuration, {
    authentication: {
      findUserById: async (userId) => {
        const user = await authContext.internalAdapter.findUserById(userId);
        return user ? { id: user.id } : null;
      },
      findUserByEmail: async (email) => {
        const record = await authContext.internalAdapter.findUserByEmail(email);
        return record?.user ? { user: { id: record.user.id } } : null;
      },
      signIn: async (email, password) => {
        await auth.api.signInEmail({ body: { email, password } });
      },
      signUp: async (email, username, password) => {
        const signup = await auth.api.signUpEmail({
          body: { email, name: username, password },
        });
        return { id: signup.user.id };
      },
      deleteUserSessions: (userId) =>
        authContext.internalAdapter.deleteUserSessions(userId),
    },
    ownerSetupContext,
    userReader,
    userWriter,
  });

  if (result.status === "already-linked") {
    console.log("Owner already exists and is linked. Skipping owner creation.");
    return;
  }

  console.log("Owner account is ready.");
  console.log({
    id: result.owner.id,
    email: result.owner.email,
    username: result.owner.username,
    role: result.owner.role,
    status: result.owner.status,
    authLinked: result.owner.auth_provider_user_id !== null,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCreateOwnerScript().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

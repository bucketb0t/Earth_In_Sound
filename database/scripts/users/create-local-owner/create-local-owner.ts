import { loadEnvConfig } from "@next/env";
import { pathToFileURL } from "node:url";

/**
 * Environment loader for owner setup.
 */
loadEnvConfig(process.cwd());

/**
 * Local owner setup script.
 */
export async function runCreateLocalOwnerScript(): Promise<void> {
  const ownerEmail = process.env.LOCAL_OWNER_EMAIL;
  const ownerUsername = process.env.LOCAL_OWNER_USERNAME;

  if (!ownerEmail || !ownerUsername) {
    console.log(
      "LOCAL_OWNER_EMAIL or LOCAL_OWNER_USERNAME is missing. Skipping owner creation.",
    );
    return;
  }

  /** Owner database function imports. */
  const { getUserByEmail } = await import(
    "../../../../lib/server/database/users/read/read-users"
  );
  const { createLocalOwner } = await import(
    "../../../../lib/server/database/users/write/write-users"
  );

  let ownerId: string;

  try {
    ownerId = await createLocalOwner({
      email: ownerEmail,
      username: ownerUsername,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Owner already exists.") {
      console.log("Owner already exists. Skipping owner creation.");
      return;
    }

    throw error;
  }

  const owner = await getUserByEmail(ownerEmail);

  console.log("Owner created successfully.");
  console.log({
    id: ownerId,
    email: owner?.email,
    username: owner?.username,
    role: owner?.role,
    status: owner?.status,
  });
}

/**
 * Direct script entry point.
 */
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCreateLocalOwnerScript().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

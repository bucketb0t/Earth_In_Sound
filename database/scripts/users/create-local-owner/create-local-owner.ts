import { loadEnvConfig } from "@next/env";
import { pathToFileURL } from "node:url";

/**
 * Environment loader for owner setup.
 */
loadEnvConfig(process.cwd());

/**
 * Local owner setup script.
 *
 * Public signup never creates owner/admin accounts. This script is the manual
 * setup path for the first owner and is controlled by LOCAL_OWNER_EMAIL and
 * LOCAL_OWNER_USERNAME.
 */
export async function runCreateLocalOwnerScript(): Promise<void> {
  /*
   * The owner identity is supplied by environment variables, not hard-coded.
   */
  const ownerEmail = process.env.LOCAL_OWNER_EMAIL;
  const ownerUsername = process.env.LOCAL_OWNER_USERNAME;

  if (!ownerEmail || !ownerUsername) {
    /*
     * Missing setup vars means local setup can continue without creating owner.
     */
    console.log(
      "LOCAL_OWNER_EMAIL or LOCAL_OWNER_USERNAME is missing. Skipping owner creation.",
    );
    return;
  }

  /**
   * Owner database function imports.
   * They load after .env.local so database credentials are available.
   */
  const { getUserByEmail } = await import(
    "../../../../lib/server/database/users/read/read-users"
  );
  const { createLocalOwner } = await import(
    "../../../../lib/server/database/users/write/write-users"
  );

  let ownerId: string;

  try {
    /*
     * createLocalOwner contains uniqueness and single-owner protections.
     */
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

  /*
   * Log public profile fields only.
   */
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

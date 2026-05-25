import { loadEnvConfig } from "@next/env";

/**
 * Load .env.local before importing database code.
 * turso.ts reads process.env as soon as it is imported.
 */
loadEnvConfig(process.cwd());

async function main(): Promise<void> {
  const ownerEmail = process.env.LOCAL_OWNER_EMAIL;
  const ownerUsername = process.env.LOCAL_OWNER_USERNAME;

  if (!ownerEmail) {
    throw new Error("Missing LOCAL_OWNER_EMAIL.");
  }

  if (!ownerUsername) {
    throw new Error("Missing LOCAL_OWNER_USERNAME.");
  }

  /**
   * Import after env loading so TURSO_DATABASE_URL and TURSO_AUTH_TOKEN exist.
   */
  const { createLocalOwner, getUserByEmail } = await import(
    "../../lib/database/users"
  );

  const ownerId = await createLocalOwner({
    email: ownerEmail,
    username: ownerUsername,
  });

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

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

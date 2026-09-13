import { pathToFileURL } from "node:url";
import { getMigrations } from "better-auth/db/migration";
import { loadEnvConfig } from "@next/env";

/** Load local credentials before initializing auth. */
loadEnvConfig(process.cwd());

/** Apply Better Auth's generated migrations to its own tables. */
export async function runBetterAuthMigrationsScript(): Promise<void> {
  /* Import auth after loading environment variables. */
  const { auth } = await import("../../../../authentication/auth");
  const { runMigrations } = await getMigrations(auth.options);

  await runMigrations();
  console.log("Better Auth migrations finished.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runBetterAuthMigrationsScript().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

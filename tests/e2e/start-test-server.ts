import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

const projectRoot = process.cwd();
const testResultsRoot = resolve(projectRoot, "test-results");
const databaseDirectory = join(testResultsRoot, "e2e-database");
const databasePath = join(databaseDirectory, "test.db").replaceAll("\\", "/");
const serverPort = "3100";

/**
 * Starts Next.js against a disposable database for Playwright.
 * Browser auth tests can therefore create users without touching local or
 * production data, and an existing development server is never reused.
 */
async function main(): Promise<void> {
  const relativeDatabaseDirectory = relative(
    testResultsRoot,
    databaseDirectory,
  );
  if (
    relativeDatabaseDirectory.startsWith("..") ||
    isAbsolute(relativeDatabaseDirectory)
  ) {
    throw new Error("Refusing to prepare an E2E database outside test-results.");
  }

  await rm(databaseDirectory, { recursive: true, force: true });
  await mkdir(databaseDirectory, { recursive: true });

  process.env.TURSO_DATABASE_URL = `file:${databasePath}`;
  process.env.TURSO_AUTH_TOKEN = "local-e2e-token";
  process.env.BETTER_AUTH_SECRET =
    "earth-in-sound-e2e-secret-at-least-thirty-two-characters";
  process.env.BETTER_AUTH_URL = `http://localhost:${serverPort}`;
  process.env.EIS_SILENCE_BETTER_AUTH_LOGS = "true";
  process.env.NEXT_TELEMETRY_DISABLED = "1";

  const [{ runProjectMigrationsScript }, { runBetterAuthMigrationsScript }] =
    await Promise.all([
      import("../../backend/database/scripts/run-project-migrations/run-project-migrations"),
      import("../../backend/database/scripts/auth/run-better-auth-migrations/run-better-auth-migrations"),
    ]);

  await runProjectMigrationsScript();
  await runBetterAuthMigrationsScript();

  const [{ betterAuthDatabase }, { turso }] = await Promise.all([
    import("../../backend/authentication/better-auth-database"),
    import("../../backend/database/turso-client"),
  ]);
  await betterAuthDatabase.destroy();
  turso.close();

  const nextCliPath = join(
    projectRoot,
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );
  const server = spawn(process.execPath, [nextCliPath, "dev", "-p", serverPort], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });

  const stopServer = (): void => {
    if (!server.killed) server.kill();
  };

  process.once("SIGINT", stopServer);
  process.once("SIGTERM", stopServer);
  server.once("error", (error) => {
    console.error(error);
    process.exitCode = 1;
  });
  server.once("exit", (code) => {
    process.exitCode = code ?? 0;
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

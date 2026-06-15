import { loadEnvConfig } from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

loadEnvConfig(process.cwd());

const migrationsDirectory = fileURLToPath(
  new URL("../../migrations/", import.meta.url),
);

const legacyMigrationIds = [
  "001_create_users.sql",
  "002_allow_deleted_user_status.sql",
];

/**
 * Applies committed project migrations once, in filename order.
 */
export async function runProjectMigrationsScript(): Promise<void> {
  const { turso } = await import(
    "../../../lib/server/database/turso-client"
  );

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS project_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);

  const [migrationCount, usersTable] = await Promise.all([
    turso.execute("SELECT COUNT(*) AS count FROM project_migrations"),
    turso.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'",
    ),
  ]);

  const hasMigrationHistory =
    Number(migrationCount.rows[0]?.count ?? 0) > 0;
  const hasExistingUsersTable = usersTable.rows.length > 0;

  /*
   * Existing databases predate project_migrations. Their users table already
   * represents the historical 001/002 state, so record that baseline instead
   * of replaying the old table-rebuild migration.
   */
  if (!hasMigrationHistory && hasExistingUsersTable) {
    const now = Date.now();
    await turso.batch(
      legacyMigrationIds.map((migrationId) => ({
        sql: `
          INSERT OR IGNORE INTO project_migrations (id, applied_at)
          VALUES (?, ?)
        `,
        args: [migrationId, now],
      })),
      "write",
    );
  }

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const appliedMigration = await turso.execute({
      sql: "SELECT id FROM project_migrations WHERE id = ? LIMIT 1",
      args: [migrationFile],
    });

    if (appliedMigration.rows.length > 0) {
      console.log(`Project migration already applied: ${migrationFile}`);
      continue;
    }

    const migrationSql = await readFile(
      new URL(`../../migrations/${migrationFile}`, import.meta.url),
      "utf8",
    );

    await turso.executeMultiple(migrationSql);
    await turso.execute({
      sql: "INSERT INTO project_migrations (id, applied_at) VALUES (?, ?)",
      args: [migrationFile, Date.now()],
    });
    console.log(`Project migration applied: ${migrationFile}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runProjectMigrationsScript().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

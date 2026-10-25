import { requireEnvironmentVariable } from "@/backend/configuration/environment";

type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

export interface DatabaseConfiguration {
  url: string;
  authToken: string;
}

/** Read the shared credentials required by every database adapter. */
export function readDatabaseConfiguration(
  environment: EnvironmentVariables,
): Readonly<DatabaseConfiguration> {
  return Object.freeze({
    url: requireEnvironmentVariable("TURSO_DATABASE_URL", environment),
    authToken: requireEnvironmentVariable("TURSO_AUTH_TOKEN", environment),
  });
}

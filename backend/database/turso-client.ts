import { createClient } from "@libsql/client";
import { requireEnvironmentVariable } from "@/backend/configuration/environment";

/** Server-only credentials for project queries. */
const tursoDatabaseUrl = requireEnvironmentVariable("TURSO_DATABASE_URL");
const tursoAuthToken = requireEnvironmentVariable("TURSO_AUTH_TOKEN");

/** Better Auth uses a separate connection to the same database. */
export const turso = createClient({
  url: tursoDatabaseUrl,
  authToken: tursoAuthToken,
});

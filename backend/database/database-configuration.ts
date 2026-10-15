import { requireEnvironmentVariable } from "@/backend/configuration/environment";

/** Shared credentials used by every server-side database client. */
export const databaseConfiguration = Object.freeze({
  url: requireEnvironmentVariable("TURSO_DATABASE_URL"),
  authToken: requireEnvironmentVariable("TURSO_AUTH_TOKEN"),
});

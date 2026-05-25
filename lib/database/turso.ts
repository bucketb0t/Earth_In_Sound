import { createClient } from "@libsql/client";

/**
 * Turso database credentials.
 *
 * These values come from .env.local during local development and from the
 * hosting provider's environment variables in production.
 *
 * IMPORTANT:
 * This file must only be imported by server-side code or setup scripts.
 * TURSO_AUTH_TOKEN is private and must never be exposed to browser code.
 */
const tursoDatabaseUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

/**
 * Fail early if the app starts without database credentials.
 * This avoids confusing database errors later in the request lifecycle.
 */
if (!tursoDatabaseUrl) {
  throw new Error("Missing TURSO_DATABASE_URL in .env.local.");
}

if (!tursoAuthToken) {
  throw new Error("Missing TURSO_AUTH_TOKEN in .env.local.");
}

/**
 * Shared server-side Turso client.
 *
 * Keep this file out of "use client" components because TURSO_AUTH_TOKEN must
 * never be bundled into browser JavaScript.
 */
export const turso = createClient({
  url: tursoDatabaseUrl,
  authToken: tursoAuthToken,
});

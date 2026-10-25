import assert from "node:assert/strict";

import { readApplicationConfiguration } from "../../../backend/configuration/application-configuration";
import { readDatabaseConfiguration } from "../../../backend/database/database-configuration";
import {
  requireAuthBaseUrl,
  requireAuthSecret,
} from "../../../backend/configuration/environment";

const validAuthSecret =
  "earth-in-sound-test-secret-at-least-thirty-two-characters";

/** Test required authentication environment configuration. */
export function runEnvironmentTests(): void {
  const validEnvironment = {
    BETTER_AUTH_URL: "http://localhost:3000",
  };

  assert.deepEqual(
    readApplicationConfiguration({}, "Default Project"),
    {
      name: "Default Project",
      silenceAuthenticationLogs: false,
    },
    "application configuration should use safe defaults",
  );

  assert.deepEqual(
    readApplicationConfiguration(
      {
        APPLICATION_NAME: " Another Band ",
        SILENCE_AUTHENTICATION_LOGS: "true",
      },
      "Default Project",
    ),
    {
      name: "Another Band",
      silenceAuthenticationLogs: true,
    },
    "application configuration should accept deployment overrides",
  );

  assert.deepEqual(
    readDatabaseConfiguration({
      TURSO_DATABASE_URL: "libsql://database.example.com",
      TURSO_AUTH_TOKEN: "database-token",
    }),
    {
      url: "libsql://database.example.com",
      authToken: "database-token",
    },
    "database configuration should be returned as one validated unit",
  );

  assert.equal(
    requireAuthSecret({
      BETTER_AUTH_SECRET: validAuthSecret,
    }),
    validAuthSecret,
    "a valid authentication secret should be returned",
  );

  assert.throws(
    () => requireAuthSecret({}),
    {
      message: "Missing required environment variable: BETTER_AUTH_SECRET.",
    },
    "a missing authentication secret should be rejected",
  );

  assert.throws(
    () =>
      requireAuthSecret({
        BETTER_AUTH_SECRET: "   ",
      }),
    {
      message: "Missing required environment variable: BETTER_AUTH_SECRET.",
    },
    "a blank authentication secret should be rejected",
  );

  assert.throws(
    () =>
      requireAuthSecret({
        BETTER_AUTH_SECRET: "x".repeat(31),
      }),
    {
      message: "BETTER_AUTH_SECRET must be at least 32 characters long.",
    },
    "a short authentication secret should be rejected",
  );

  assert.equal(
    requireAuthBaseUrl(validEnvironment),
    "http://localhost:3000",
    "a configured authentication URL should be returned",
  );

  assert.throws(
    () => requireAuthBaseUrl({}),
    {
      message: "Missing required environment variable: BETTER_AUTH_URL.",
    },
    "a missing authentication URL should be rejected",
  );

  assert.throws(
    () =>
      requireAuthBaseUrl({
        BETTER_AUTH_URL: "   ",
      }),
    {
      message: "Missing required environment variable: BETTER_AUTH_URL.",
    },
    "a blank authentication URL should be rejected",
  );

  assert.throws(
    () =>
      requireAuthBaseUrl({
        BETTER_AUTH_URL: "not-a-url",
      }),
    {
      message: "BETTER_AUTH_URL must be a valid absolute URL.",
    },
    "a malformed authentication URL should be rejected",
  );

  assert.throws(
    () =>
      requireAuthBaseUrl({
        BETTER_AUTH_URL: "ftp://example.com",
      }),
    {
      message: "BETTER_AUTH_URL must use HTTP or HTTPS.",
    },
    "an unsupported URL protocol should be rejected",
  );

  assert.throws(
    () =>
      requireAuthBaseUrl({
        BETTER_AUTH_URL: "http://example.com",
      }),
    {
      message: "BETTER_AUTH_URL must use HTTPS for non-local addresses.",
    },
    "an insecure public authentication URL should be rejected",
  );

  assert.throws(
    () =>
      requireAuthBaseUrl({
        BETTER_AUTH_URL: "https://user:password@example.com",
      }),
    {
      message: "BETTER_AUTH_URL must not include credentials.",
    },
    "authentication URL credentials should be rejected",
  );

  assert.throws(
    () =>
      requireAuthBaseUrl({
        BETTER_AUTH_URL: "https://example.com/auth?mode=test#section",
      }),
    {
      message: "BETTER_AUTH_URL must contain only an origin.",
    },
    "an authentication URL with extra components should be rejected",
  );

  assert.equal(
    requireAuthBaseUrl({
      BETTER_AUTH_URL: "http://127.0.0.1:3000/",
    }),
    "http://127.0.0.1:3000",
    "an IPv4 loopback URL should be accepted and normalized",
  );

  assert.equal(
    requireAuthBaseUrl({
      BETTER_AUTH_URL: "http://[::1]:3000/",
    }),
    "http://[::1]:3000",
    "an IPv6 loopback URL should be accepted and normalized",
  );
}

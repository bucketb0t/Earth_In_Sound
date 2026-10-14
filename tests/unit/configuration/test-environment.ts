import assert from "node:assert/strict";

import { requireAuthBaseUrl } from "../../../backend/configuration/environment";

/** Test required authentication environment configuration. */
export function runEnvironmentTests(): void {
  const validEnvironment: Partial<NodeJS.ProcessEnv> = {
    BETTER_AUTH_URL: "http://localhost:3000",
  };

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

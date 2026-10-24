type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

/** Identify hostnames that refer to the current computer. */
function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname) ||
    hostname === "[::1]"
  );
}

/** Read a required setting without exposing its value in errors. */
export function requireEnvironmentVariable(
  name: string,
  environment: EnvironmentVariables,
): string {
  const value = environment[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value;
}

/** Require an authentication secret of at least 32 characters. */
export function requireAuthSecret(environment: EnvironmentVariables): string {
  const secret = requireEnvironmentVariable("BETTER_AUTH_SECRET", environment);

  if (secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long.");
  }

  return secret;
}

/** Read the URL used as Better Auth's public origin. */
export function requireAuthBaseUrl(environment: EnvironmentVariables): string {
  const value = requireEnvironmentVariable("BETTER_AUTH_URL", environment);

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTP or HTTPS.");
  }

  if (url.username.length > 0 || url.password.length > 0) {
    throw new Error("BETTER_AUTH_URL must not include credentials.");
  }

  if (url.pathname !== "/" || url.search.length > 0 || url.hash.length > 0) {
    throw new Error("BETTER_AUTH_URL must contain only an origin.");
  }

  if (url.protocol === "http:" && !isLocalHostname(url.hostname)) {
    throw new Error("BETTER_AUTH_URL must use HTTPS for non-local addresses.");
  }

  return url.origin;
}

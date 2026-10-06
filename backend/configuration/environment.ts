/** Read a required setting without exposing its value in errors. */

export function requireEnvironmentVariable(
  name: string,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const value = environment[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}.`);
  }

  return value;
}

/** Require an authentication secret of at least 32 characters. */
export function requireAuthSecret(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const secret = requireEnvironmentVariable("BETTER_AUTH_SECRET", environment);

  if (secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters long.");
  }

  return secret;
}

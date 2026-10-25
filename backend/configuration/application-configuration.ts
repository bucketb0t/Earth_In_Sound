type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

export interface ApplicationConfiguration {
  name: string;
  silenceAuthenticationLogs: boolean;
}

/** Read non-secret application identity and operational settings. */
export function readApplicationConfiguration(
  environment: EnvironmentVariables,
  defaultName: string,
): ApplicationConfiguration {
  const configuredName = environment.APPLICATION_NAME?.trim();

  return Object.freeze({
    name: configuredName || defaultName,
    silenceAuthenticationLogs:
      environment.SILENCE_AUTHENTICATION_LOGS === "true",
  });
}

export const applicationConfiguration = readApplicationConfiguration(
  process.env,
  "Earth In Sound",
);

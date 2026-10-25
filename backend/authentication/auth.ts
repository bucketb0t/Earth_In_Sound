import { applicationConfiguration } from "@/backend/configuration/application-configuration";
import {
  requireAuthBaseUrl,
  requireAuthSecret,
} from "@/backend/configuration/environment";
import { userReader, userWriter } from "@/backend/database/users/user-module";
import { betterAuthDatabase } from "@/backend/database/database-module";
import { createAuthentication } from "./create-authentication";
import { ownerSetupContext } from "@/backend/ownership/owner-setup-context";

/** Production authentication assembled from reusable modules. */
export const auth = createAuthentication({
  configuration: {
    appName: applicationConfiguration.name,
    baseUrl: requireAuthBaseUrl(process.env),
    secret: requireAuthSecret(process.env),
    silenceLogs: applicationConfiguration.silenceAuthenticationLogs,
  },
  database: {
    db: betterAuthDatabase,
    type: "sqlite",
    casing: "snake",
  },
  ownerSetupContext,
  userReader,
  userWriter,
});

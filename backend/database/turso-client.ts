import { createClient } from "@libsql/client";
import { databaseConfiguration } from "./database-configuration";

/** Project query client; Better Auth uses a separate database adapter. */
export const turso = createClient(databaseConfiguration);

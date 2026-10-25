import { createClient, type Client } from "@libsql/client";
import type { DatabaseConfiguration } from "./database-configuration";

/** Create a project query client from explicit database configuration. */
export function createTursoClient(
  configuration: DatabaseConfiguration,
): Client {
  return createClient(configuration);
}

import { createAuthUserLifecycle } from "@/backend/authentication/auth-user-lifecycle";
import { turso } from "../database-module";
import { createUserReader } from "./read/read-users";
import { createUserWriter } from "./write/write-users";

export const userReader = createUserReader(turso);

const authUserLifecycle = createAuthUserLifecycle(turso);

export const userWriter = createUserWriter({
  database: turso,
  userReader,
  authUserLifecycle,
});

/** Production user capabilities assembled from reusable factories. */
export const userModule = Object.freeze({
  reader: userReader,
  writer: userWriter,
});

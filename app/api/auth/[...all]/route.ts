import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/backend/authentication/auth";

/** Forward browser auth requests to the server-only Better Auth configuration. */
export const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(auth);

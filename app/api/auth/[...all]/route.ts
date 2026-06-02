import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/server/auth/auth";

/**
 * Better Auth API endpoint.
 * Delegates every auth HTTP method to the Better Auth server config.
 *
 * The browser never imports lib/server/auth/auth.ts directly. Instead, the
 * browser auth client sends HTTP requests here, and this handler forwards those
 * requests to Better Auth. That keeps server secrets on the server.
 */
export const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(auth);

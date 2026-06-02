"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client.
 * Components use this to sign up, sign in, sign out, and read sessions.
 * This file is client-only and never receives Turso credentials.
 *
 * Think of this as the browser's "remote control" for auth. It does not know
 * how passwords are stored and it does not connect to Turso. It only knows how
 * to call the Better Auth API route that lives under app/api/auth/[...all].
 */
export const authClient = createAuthClient();

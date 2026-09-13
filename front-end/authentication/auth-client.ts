"use client";

import { createAuthClient } from "better-auth/react";

/** Browser auth client; requests go through the server API, never directly to Turso. */
export const authClient = createAuthClient();

import { z } from "zod";
/*
 * Values permitted by the users table.
 * These schemas verify database values at runtime.
 */

const userRoleSchema = z.enum(["owner", "admin", "user"]);
const userStatusSchema = z.enum(["active", "disabled", "deleted"]);

/*
 * Complete shape expected from a SELECT * query on the users table.
 */

export const storedUserSchema = z
  .strictObject({
    id: z.string().min(1),
    auth_provider_user_id: z.string().min(1).nullable(),
    email: z.string().min(1),
    email_lookup: z.string().min(1),
    username: z.string().min(1),
    username_lookup: z.string().min(1),
    role: userRoleSchema,
    status: userStatusSchema,
    created_at: z.number().int().nonnegative(),
    updated_at: z.number().int().nonnegative(),
  })
  .refine((user) => user.updated_at >= user.created_at, {
    message: "updated_at cannot be earlier than created_at.",
    path: ["updated_at"],
  });

const storedUsersSchema = z.array(storedUserSchema);

/*
 * TypeScript types are now generated from the runtime schemas.
 * This prevents the runtime checks and TypeScript definitions from drifting.
 */

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type StoredUser = z.infer<typeof storedUserSchema>;

/*
 * Validate one database row while preserving the original Zod error as the
 * cause for server-side debugging.
 */

export function parseStoredUser(row: unknown): StoredUser {
  const result = storedUserSchema.safeParse(row);
  if (!result.success) {
    throw new Error("The database returned an invalid user row.", {
      cause: result.error,
    });
  }
  return result.data;
}

/*
 * Validate a complete list returned by a multi-row query.
 */

export function parseStoredUsers(rows: unknown): StoredUser[] {
  const result = storedUsersSchema.safeParse(rows);
  if (!result.success) {
    throw new Error("The database returned an invalid list of user rows.", {
      cause: result.error,
    });
  }
  return result.data;
}

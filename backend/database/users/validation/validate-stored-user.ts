import { z } from "zod";
/* Runtime schemas match the users table's allowed roles and statuses. */

const userRoleSchema = z.enum(["owner", "admin", "user"]);
const userStatusSchema = z.enum(["active", "disabled", "deleted"]);

/* Strict row schema for SELECT * queries. */

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

/* Derive types from schemas to keep compile-time and runtime validation aligned. */

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type StoredUser = z.infer<typeof storedUserSchema>;

/* Validate a row and retain the Zod error as the cause. */

export function parseStoredUser(row: unknown): StoredUser {
  const result = storedUserSchema.safeParse(row);
  if (!result.success) {
    throw new Error("The database returned an invalid user row.", {
      cause: result.error,
    });
  }
  return result.data;
}

/* Validate every row in a query result. */

export function parseStoredUsers(rows: unknown): StoredUser[] {
  const result = storedUsersSchema.safeParse(rows);
  if (!result.success) {
    throw new Error("The database returned an invalid list of user rows.", {
      cause: result.error,
    });
  }
  return result.data;
}

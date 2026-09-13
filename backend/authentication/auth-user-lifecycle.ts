/**
 * Better Auth lifecycle operations used by project account management.
 *
 * The dynamic import avoids a module cycle because auth.ts imports the project
 * user write hooks used during signup.
 *
 * These project-admin operations target another user without an HTTP session.
 * Better Auth's public user endpoints are session-oriented, while its admin
 * plugin would duplicate this project's role model and database fields.
 */
import { turso } from "@/backend/database/turso-client";

async function getInternalAuthAdapter() {
  const { auth } = await import("./auth");
  const context = await auth.$context;
  return context.internalAdapter;
}

export async function deleteAuthUser(
  authProviderUserId: string,
): Promise<void> {
  const internalAdapter = await getInternalAuthAdapter();
  await internalAdapter.deleteUser(authProviderUserId);
}

export interface DisableLinkedUserRecordsInput {
  authProviderUserId: string;
  projectUserId: string;
  disabledAt: number;
}

/**
 * Revokes database-backed sessions and disables the project profile in one
 * transaction. A failed profile update therefore cannot log out an otherwise
 * active account.
 */
export async function disableLinkedUserRecords(
  input: DisableLinkedUserRecordsInput,
): Promise<void> {
  await turso.batch(
    [
      {
        sql: 'DELETE FROM session WHERE "userId" = ?',
        args: [input.authProviderUserId],
      },
      {
        sql: `
          UPDATE users
          SET status = 'disabled', updated_at = ?
          WHERE id = ?
        `,
        args: [input.disabledAt, input.projectUserId],
      },
    ],
    "write",
  );
}

export interface DeleteLinkedUserRecordsInput {
  authProviderUserId: string;
  projectUserId: string;
  deletedEmailLookup: string;
  deletedAt: number;
}

/**
 * Deletes the Better Auth records and soft-deletes the project profile in one
 * database transaction.
 *
 * All statements succeed together or are all rolled back together. This works
 * because Better Auth and the project users table share the same Turso
 * database.
 */
export async function deleteLinkedUserRecords(
  input: DeleteLinkedUserRecordsInput,
): Promise<void> {
  await turso.batch(
    [
      {
        sql: 'DELETE FROM session WHERE "userId" = ?',
        args: [input.authProviderUserId],
      },
      {
        sql: 'DELETE FROM account WHERE "userId" = ?',
        args: [input.authProviderUserId],
      },
      {
        sql: 'DELETE FROM "user" WHERE id = ?',
        args: [input.authProviderUserId],
      },
      {
        sql: `
          UPDATE users
          SET
            auth_provider_user_id = NULL,
            email_lookup = ?,
            status = 'deleted',
            updated_at = ?
          WHERE id = ?
        `,
        args: [input.deletedEmailLookup, input.deletedAt, input.projectUserId],
      },
    ],
    "write",
  );
}

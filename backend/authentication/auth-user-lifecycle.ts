/**
 * Server-side account lifecycle operations; auth and profiles share one database.
 * The dynamic auth import avoids the signup-hook module cycle.
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

/** Revoke sessions and disable the profile atomically; failures preserve both. */
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

/** Delete auth records and soft-delete the profile in one shared-database transaction. */
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

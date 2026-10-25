import type { Client } from "@libsql/client";

export interface DisableLinkedUserRecordsInput {
  authProviderUserId: string;
  projectUserId: string;
  disabledAt: number;
}

export interface DeleteLinkedUserRecordsInput {
  authProviderUserId: string;
  projectUserId: string;
  deletedEmailLookup: string;
  deletedAt: number;
}

export interface AuthUserLifecycle {
  disableLinkedUserRecords(input: DisableLinkedUserRecordsInput): Promise<void>;
  deleteLinkedUserRecords(input: DeleteLinkedUserRecordsInput): Promise<void>;
}

type LifecycleDatabase = Pick<Client, "batch">;

/** Create atomic project-profile and Better Auth lifecycle operations. */
export function createAuthUserLifecycle(
  database: LifecycleDatabase,
): AuthUserLifecycle {
  async function disableLinkedUserRecords(
    input: DisableLinkedUserRecordsInput,
  ): Promise<void> {
    await database.batch(
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

  async function deleteLinkedUserRecords(
    input: DeleteLinkedUserRecordsInput,
  ): Promise<void> {
    await database.batch(
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
          args: [
            input.deletedEmailLookup,
            input.deletedAt,
            input.projectUserId,
          ],
        },
      ],
      "write",
    );
  }

  return Object.freeze({
    disableLinkedUserRecords,
    deleteLinkedUserRecords,
  });
}

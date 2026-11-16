import type { Client } from "@libsql/client";

export interface DisableLinkedUserRecordsInput {
  authProviderUserId: string;
  projectUserId: string;
  expectedUpdatedAt: number;
  disabledAt: number;
}

export interface DeleteLinkedUserRecordsInput {
  authProviderUserId: string;
  projectUserId: string;
  deletedEmailLookup: string;
  deletedAt: number;
}

export interface AuthUserLifecycle {
  disableLinkedUserRecords(
    input: DisableLinkedUserRecordsInput,
  ): Promise<boolean>;
  deleteLinkedUserRecords(input: DeleteLinkedUserRecordsInput): Promise<void>;
}

type LifecycleDatabase = Pick<Client, "batch" | "transaction">;

/** Create atomic project-profile and Better Auth lifecycle operations. */
export function createAuthUserLifecycle(
  database: LifecycleDatabase,
): AuthUserLifecycle {
  async function disableLinkedUserRecords(
    input: DisableLinkedUserRecordsInput,
  ): Promise<boolean> {
    const transaction = await database.transaction("write");

    try {
      const updatedProfile = await transaction.execute({
        sql: `
        UPDATE users
        SET status = 'disabled', updated_at = ?
        WHERE id = ?
          AND status = 'active'
          AND updated_at = ?
      `,
        args: [input.disabledAt, input.projectUserId, input.expectedUpdatedAt],
      });

      if (updatedProfile.rowsAffected !== 1) {
        await transaction.rollback();
        return false;
      }

      await transaction.execute({
        sql: 'DELETE FROM session WHERE "userId" = ?',
        args: [input.authProviderUserId],
      });

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    } finally {
      transaction.close();
    }
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

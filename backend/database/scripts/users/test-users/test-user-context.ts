import type { StoredUser } from "../../../users/read/read-users";

type AuthModule = typeof import("../../../../authentication/auth");
type OwnerSetupModule =
  typeof import("../../../../authentication/owner-setup-context");
type TursoModule = typeof import("../../../turso-client");
type UserReadsModule = typeof import("../../../users/read/read-users");
type UserWritesModule = typeof import("../../../users/write/write-users");

/**
 * Runtime dependencies shared by the user/auth integration scenarios.
 * Type-only module references keep database clients from loading before the
 * runner points them at its disposable test database.
 */
export interface UserDatabaseTestContext {
  readonly auth: AuthModule["auth"];
  readonly authContext: Awaited<AuthModule["auth"]["$context"]>;
  readonly runWithOwnerSetupContext: OwnerSetupModule["runWithOwnerSetupContext"];
  readonly turso: TursoModule["turso"];
  readonly userReads: UserReadsModule;
  readonly userWrites: UserWritesModule;
  readonly testRunId: string;
}

/**
 * Normal-user data reused by lifecycle and role-management scenarios.
 */
export interface NormalUserTestResult {
  readonly user: StoredUser;
  readonly authUserId: string;
  readonly email: string;
  readonly password: string;
}

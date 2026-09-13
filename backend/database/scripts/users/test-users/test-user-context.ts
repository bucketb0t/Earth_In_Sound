import type { StoredUser } from "../../../users/read/read-users";

type AuthModule = typeof import("../../../../authentication/auth");
type OwnerSetupModule =
  typeof import("../../../../authentication/owner-setup-context");
type TursoModule = typeof import("../../../turso-client");
type UserReadsModule = typeof import("../../../users/read/read-users");
type UserWritesModule = typeof import("../../../users/write/write-users");

/** Shared integration dependencies. Type-only imports defer clients until the test database is configured. */
export interface UserDatabaseTestContext {
  readonly auth: AuthModule["auth"];
  readonly authContext: Awaited<AuthModule["auth"]["$context"]>;
  readonly runWithOwnerSetupContext: OwnerSetupModule["runWithOwnerSetupContext"];
  readonly turso: TursoModule["turso"];
  readonly userReads: UserReadsModule;
  readonly userWrites: UserWritesModule;
  readonly testRunId: string;
}

/** User fixture shared by lifecycle and role tests. */
export interface NormalUserTestResult {
  readonly user: StoredUser;
  readonly authUserId: string;
  readonly email: string;
  readonly password: string;
}

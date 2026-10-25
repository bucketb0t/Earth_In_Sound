import type { StoredUser } from "../../../users/read/read-users";

type AuthModule = typeof import("../../../../authentication/auth");
type OwnerSetupModule =
  typeof import("../../../../ownership/owner-setup-context");
type DatabaseModule = typeof import("../../../database-module");
type UserModule = typeof import("../../../users/user-module");

/** Shared integration dependencies. Type-only imports defer clients until the test database is configured. */
export interface UserDatabaseTestContext {
  readonly auth: AuthModule["auth"];
  readonly authContext: Awaited<AuthModule["auth"]["$context"]>;
  readonly runWithOwnerSetupContext: OwnerSetupModule["ownerSetupContext"]["run"];
  readonly turso: DatabaseModule["turso"];
  readonly userReads: UserModule["userReader"];
  readonly userWrites: UserModule["userWriter"];
  readonly testRunId: string;
}

/** User fixture shared by lifecycle and role tests. */
export interface NormalUserTestResult {
  readonly user: StoredUser;
  readonly authUserId: string;
  readonly email: string;
  readonly password: string;
}

import { betterAuth } from "better-auth";
import type { StoredUser } from "../../../users/read/read-users";
import type { UserDatabaseTestContext } from "./test-user-context";
import { assert } from "./test-user-helpers";

function sessionHeaders(response: Response): Headers {
  const cookies = response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
  return new Headers({ cookie: cookies.join("; "), origin: "http://localhost:3000" });
}

/** Test authenticated account endpoints, linked-name rollback, and protected closure. */
export async function testAccountManagement(context: UserDatabaseTestContext, owner: StoredUser): Promise<void> {
  const { auth, authContext, turso, userReads, userWrites, testRunId } = context;
  const email = `${testRunId}-settings@example.com`;
  const password = "Account-settings-password-123";
  const signup = await auth.api.signUpEmail({
    body: { email, password, name: `${testRunId}-settings` },
  });
  const profile = await userReads.getUserByAuthProviderId(signup.user.id);
  assert(profile !== null, "account settings fixture should have a profile");
  const signedIn = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
  const headers = sessionHeaders(signedIn);

  function request(path: string, body?: unknown, requestHeaders = headers) {
    const nextHeaders = new Headers(requestHeaders);
    nextHeaders.set("content-type", "application/json");
    return auth.handler(new Request(`http://localhost:3000/api/auth${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: nextHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    }));
  }

  /* Require a valid session and reject actor IDs supplied by the browser. */
  assert((await request("/account/profile", undefined, new Headers())).status === 401,
    "anonymous users must not read account profiles");
  assert((await request("/account/update-username", { username: "anonymous" }, new Headers())).status === 401,
    "anonymous users must not change account profiles");
  assert((await request("/account/close", { currentPassword: password, confirmation: "DELETE" }, new Headers())).status === 401,
    "anonymous users must not close accounts");
  assert((await request("/account/update-username", { username: "injected", currentUserId: owner.id })).status === 400,
    "profile input must reject forged actor IDs");
  assert((await request("/account/close", { currentPassword: password, confirmation: "DELETE", targetUserId: owner.id })).status === 400,
    "closure input must reject target user IDs");
  const foreignHeaders = new Headers(headers);
  foreignHeaders.set("origin", "https://untrusted.example");
  assert((await request("/account/update-username", { username: "foreign" }, foreignHeaders)).status === 403,
    "account writes must reject foreign origins");
  assert((await request("/update-user", { name: "bypass" })).status === 404,
    "public auth updates must not bypass project username rules");
  assert((await request("/delete-user", { password })).status === 404,
    "public auth deletion must not bypass project closure rules");

  /* Normalize names in both stores and enforce reserved identities. */
  const newUsername = `${testRunId}-account-new`;
  assert((await request("/account/update-username", { username: ` ${newUsername} ` })).status === 200,
    "an authenticated user should be able to rename their account");
  assert((await userReads.getUserById(profile.id))?.username === newUsername,
    "renaming should update the project profile");
  assert((await authContext.internalAdapter.findUserById(signup.user.id))?.name === newUsername,
    "renaming should update Better Auth's display name");
  assert((await auth.api.getSession({ headers }))?.user.name === newUsername,
    "existing sessions should read the updated display name");
  assert((await request("/account/update-username", { username: owner.username.toUpperCase() })).status === 400,
    "reserved names must remain case-insensitively unique");
  assert((await request("/account/update-username", { username: "bad..name" })).status === 400,
    "account endpoints must apply domain username validation");

  /* An auth write failure must roll back the earlier profile write. */
  await turso.execute(`CREATE TRIGGER reject_auth_name_for_test
    BEFORE UPDATE OF name ON "user"
    BEGIN SELECT RAISE(ABORT, 'forced auth name update failure'); END`);
  try {
    const failedRename = await request("/account/update-username", { username: `${testRunId}-rollback` });
    assert(failedRename.status === 500, "failed linked name writes should report failure");
    assert((await failedRename.json()).message === "Could not update username. Please try again.",
      "database errors must not expose internal details");
    assert((await userReads.getUserById(profile.id))?.username === newUsername,
      "auth update failure should preserve the old project username");
    assert((await authContext.internalAdapter.findUserById(signup.user.id))?.name === newUsername,
      "auth update failure should preserve the old auth name");
  } finally {
    await turso.execute("DROP TRIGGER reject_auth_name_for_test");
  }

  /* A valid auth cookie cannot authorize an inactive project account. */
  await turso.execute({ sql: "UPDATE users SET status = 'disabled' WHERE id = ?", args: [profile.id] });
  try {
    assert((await request("/account/update-username", { username: "inactive" })).status === 403,
      "inactive profiles must not mutate through otherwise valid sessions");
    assert((await request("/account/close", { currentPassword: password, confirmation: "DELETE" })).status === 403,
      "inactive profiles must not close through otherwise valid sessions");
  } finally {
    await turso.execute({ sql: "UPDATE users SET status = 'active' WHERE id = ?", args: [profile.id] });
  }

  /* The current owner must transfer ownership before closing their account. */
  await userWrites.transferOwnership({ currentOwnerId: owner.id, targetUserId: profile.id });
  try {
    assert((await request("/account/close", { currentPassword: password, confirmation: "DELETE" })).status === 403,
      "the owner must not close the only owner account");
  } finally {
    await userWrites.transferOwnership({ currentOwnerId: profile.id, targetUserId: owner.id });
  }

  /* Closure needs both password proof and explicit confirmation. */
  assert((await request("/account/close", { currentPassword: "Wrong-password-123", confirmation: "DELETE" })).status === 400,
    "closure must reject an incorrect password");
  assert((await request("/account/close", { currentPassword: password, confirmation: "delete" })).status === 400,
    "closure must reject invalid confirmation");
  assert((await request("/account/profile")).status === 200,
    "rejected closure attempts must preserve access");

  await turso.execute(`CREATE TRIGGER reject_account_closure_for_test
    BEFORE UPDATE OF status ON users WHEN NEW.status = 'deleted'
    BEGIN SELECT RAISE(ABORT, 'forced account closure failure'); END`);
  try {
    assert((await request("/account/close", { currentPassword: password, confirmation: "DELETE" })).status === 500,
      "closure must report failed profile writes");
    assert((await request("/account/profile")).status === 200,
      "failed closure must preserve the authenticated session");
    assert((await userReads.getUserById(profile.id))?.status === "active",
      "failed closure must preserve the active profile");
  } finally {
    await turso.execute("DROP TRIGGER reject_account_closure_for_test");
  }

  const closed = await request("/account/close", { currentPassword: password, confirmation: "DELETE" });
  assert(closed.status === 200, "confirmed closure should succeed");
  assert(closed.headers.getSetCookie().some((cookie) => cookie.includes("Max-Age=0")),
    "closure should clear browser session cookies");
  assert((await request("/account/profile")).status === 401,
    "closed accounts must not retain session access");
  assert((await authContext.internalAdapter.findUserById(signup.user.id)) === null,
    "closed accounts must lose their auth records");
  const deleted = await userReads.getUserById(profile.id);
  assert(deleted?.status === "deleted" && deleted.username_lookup === newUsername,
    "closure must retain the soft-deleted profile and reserved username");
  assert(await userReads.getUserByEmail(email) === null,
    "closure should release the original email lookup");

  /* Production-enabled auth throttling bounds password confirmation attempts. */
  const rateEmail = `${testRunId}-rate@example.com`;
  await auth.api.signUpEmail({ body: { email: rateEmail, password, name: `${testRunId}-rate` } });
  const rateSession = await auth.api.signInEmail({ body: { email: rateEmail, password }, asResponse: true });
  const limited = betterAuth({ ...auth.options, rateLimit: { enabled: true, storage: "memory" } });
  for (let attempt = 0; attempt < 6; attempt++) {
    const limitedHeaders = sessionHeaders(rateSession);
    limitedHeaders.set("content-type", "application/json");
    limitedHeaders.set("x-forwarded-for", "198.51.100.47");
    const result = await limited.handler(new Request("http://localhost:3000/api/auth/account/close", {
      method: "POST", headers: limitedHeaders,
      body: JSON.stringify({ currentPassword: "wrong", confirmation: "DELETE" }),
    }));
    assert(result.status === (attempt < 5 ? 400 : 429),
      "account closure should rate-limit repeated confirmation requests");
  }
}

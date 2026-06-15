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
async function getInternalAuthAdapter() {
  const { auth } = await import("./auth");
  const context = await auth.$context;
  return context.internalAdapter;
}

export async function revokeAuthUserSessions(
  authProviderUserId: string,
): Promise<void> {
  const internalAdapter = await getInternalAuthAdapter();
  await internalAdapter.deleteUserSessions(authProviderUserId);
}

export async function deleteAuthUser(
  authProviderUserId: string,
): Promise<void> {
  const internalAdapter = await getInternalAuthAdapter();
  await internalAdapter.deleteUser(authProviderUserId);
}

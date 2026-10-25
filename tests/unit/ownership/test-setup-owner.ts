import assert from "node:assert/strict";
import type { StoredUser } from "../../../backend/database/users/read/read-users";
import type { OwnerAuthenticationGateway } from "../../../backend/ownership/setup-owner";
import { setupOwner } from "../../../backend/ownership/setup-owner";

const configuration = {
  email: "owner@example.com",
  username: "owner",
  password: "owner-password-123",
};

function createOwner(authProviderUserId: string | null): StoredUser {
  return {
    id: "owner-id",
    auth_provider_user_id: authProviderUserId,
    email: configuration.email,
    email_lookup: configuration.email,
    username: configuration.username,
    username_lookup: configuration.username,
    role: "owner",
    status: "active",
    created_at: 1,
    updated_at: 1,
  };
}

/** Verify owner setup independently from Better Auth and Turso implementations. */
export async function runSetupOwnerTests(): Promise<void> {
  const linkedOwner = createOwner("linked-auth-id");
  const alreadyLinked = await setupOwner(configuration, {
    authentication: {
      findUserById: async () => ({ id: "linked-auth-id" }),
      findUserByEmail: async () => null,
      signIn: async () => assert.fail("sign-in should not run"),
      signUp: async () => assert.fail("sign-up should not run"),
      deleteUserSessions: async () => assert.fail("cleanup should not run"),
    },
    ownerSetupContext: {
      run: async () => assert.fail("trusted setup should not run"),
      getIdentity: () => null,
    },
    userReader: { getOwner: async () => linkedOwner },
    userWriter: {
      createOrLinkOwnerAfterSignup: async () =>
        assert.fail("owner linking should not run"),
    },
  });

  assert.equal(alreadyLinked.status, "already-linked");
  assert.equal(alreadyLinked.owner, linkedOwner);

  await assert.rejects(
    () =>
      setupOwner(configuration, {
        authentication: {
          findUserById: async () => null,
          findUserByEmail: async () => null,
          signIn: async () => undefined,
          signUp: async () => ({ id: "unused" }),
          deleteUserSessions: async () => undefined,
        },
        ownerSetupContext: {
          run: async (_identity, action) => action(),
          getIdentity: () => null,
        },
        userReader: { getOwner: async () => linkedOwner },
        userWriter: {
          createOrLinkOwnerAfterSignup: async () => linkedOwner,
        },
      }),
    /missing authentication account/,
  );

  let currentOwner = createOwner(null);
  let signedIn = false;
  let sessionsDeletedFor = "";
  let trustedIdentity = "";
  const existingAuthentication: OwnerAuthenticationGateway = {
    findUserById: async () => null,
    findUserByEmail: async () => ({ user: { id: "existing-auth-id" } }),
    signIn: async (email, password) => {
      signedIn =
        email === configuration.email && password === configuration.password;
    },
    signUp: async () => assert.fail("existing auth users should not sign up"),
    deleteUserSessions: async (userId) => {
      sessionsDeletedFor = userId;
    },
  };

  const repaired = await setupOwner(configuration, {
    authentication: existingAuthentication,
    ownerSetupContext: {
      run: async (identity, action) => {
        trustedIdentity = `${identity.email}:${identity.username}`;
        return action();
      },
      getIdentity: () => null,
    },
    userReader: { getOwner: async () => currentOwner },
    userWriter: {
      createOrLinkOwnerAfterSignup: async (input) => {
        currentOwner = createOwner(input.authProviderUserId);
        return currentOwner;
      },
    },
  });

  assert.equal(repaired.status, "ready");
  assert.equal(repaired.owner.auth_provider_user_id, "existing-auth-id");
  assert.equal(signedIn, true);
  assert.equal(sessionsDeletedFor, "existing-auth-id");
  assert.equal(trustedIdentity, "owner@example.com:owner");
}

import assert from "node:assert/strict";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/shared/account-policy";
import { readOwnerSetupConfiguration } from "../../../backend/ownership/owner-setup-configuration";

const incompleteConfigurationMessage =
  "LOCAL_OWNER_EMAIL, LOCAL_OWNER_USERNAME, and LOCAL_OWNER_PASSWORD must either all be provided or all be omitted.";

const passwordLengthMessage = `LOCAL_OWNER_PASSWORD must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`;

const validOwnerPassword = "valid-owner-password-123";

const incompleteOwnerEnvironments = [
  {
    LOCAL_OWNER_USERNAME: "owner",
    LOCAL_OWNER_PASSWORD: "valid-owner-password-123",
  },
  {
    LOCAL_OWNER_EMAIL: "owner@example.com",
    LOCAL_OWNER_PASSWORD: "valid-owner-password-123",
  },
  {
    LOCAL_OWNER_EMAIL: "owner@example.com",
    LOCAL_OWNER_USERNAME: "owner",
  },
];

/** Test optional, complete, incomplete, and invalid owner configuration. */
export function runOwnerSetupConfigurationTests(): void {
  assert.equal(
    readOwnerSetupConfiguration({}),
    null,
    "missing owner configuration should disable owner setup",
  );

  assert.equal(
    readOwnerSetupConfiguration({
      LOCAL_OWNER_EMAIL: " ",
      LOCAL_OWNER_USERNAME: " ",
      LOCAL_OWNER_PASSWORD: " ",
    }),
    null,
    "blank owner configuration should disable owner setup",
  );

  assert.deepEqual(
    readOwnerSetupConfiguration({
      LOCAL_OWNER_EMAIL: " Owner@Example.com ",
      LOCAL_OWNER_USERNAME: " owner.name ",
      LOCAL_OWNER_PASSWORD: validOwnerPassword,
    }),
    {
      email: "Owner@Example.com",
      username: "owner.name",
      password: validOwnerPassword,
    },
    "valid owner configuration should be normalized without changing its password",
  );

  for (const environment of incompleteOwnerEnvironments) {
    assert.throws(
      () => readOwnerSetupConfiguration(environment),
      { message: incompleteConfigurationMessage },
      "partial owner configuration should be rejected",
    );
  }

  assert.throws(
    () =>
      readOwnerSetupConfiguration({
        LOCAL_OWNER_EMAIL: "invalid-email",
        LOCAL_OWNER_USERNAME: "owner",
        LOCAL_OWNER_PASSWORD: "valid-owner-password-123",
      }),
    { message: "Enter a valid email address." },
    "an invalid owner email should be rejected",
  );

  assert.throws(
    () =>
      readOwnerSetupConfiguration({
        LOCAL_OWNER_EMAIL: "owner@example.com",
        LOCAL_OWNER_USERNAME: "invalid username",
        LOCAL_OWNER_PASSWORD: "valid-owner-password-123",
      }),
    {
      message:
        'Username may use letters, numbers, "-", "_" and ".", but separators cannot touch.',
    },
    "an invalid owner username should be rejected",
  );

  assert.throws(
    () =>
      readOwnerSetupConfiguration({
        LOCAL_OWNER_EMAIL: "owner@example.com",
        LOCAL_OWNER_USERNAME: "owner",
        LOCAL_OWNER_PASSWORD: "invalid owner password",
      }),
    { message: "LOCAL_OWNER_PASSWORD cannot contain spaces." },
    "an owner password containing spaces should be rejected",
  );

  assert.throws(
    () =>
      readOwnerSetupConfiguration({
        LOCAL_OWNER_EMAIL: "owner@example.com",
        LOCAL_OWNER_USERNAME: "owner",
        LOCAL_OWNER_PASSWORD: "x".repeat(PASSWORD_MIN_LENGTH - 1),
      }),
    { message: passwordLengthMessage },
    "a short owner password should be rejected",
  );

  assert.throws(
    () =>
      readOwnerSetupConfiguration({
        LOCAL_OWNER_EMAIL: "owner@example.com",
        LOCAL_OWNER_USERNAME: "owner",
        LOCAL_OWNER_PASSWORD: "x".repeat(PASSWORD_MAX_LENGTH + 1),
      }),
    { message: passwordLengthMessage },
    "a long owner password should be rejected",
  );
}

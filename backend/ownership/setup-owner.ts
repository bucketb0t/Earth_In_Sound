import type {
  StoredUser,
  UserReader,
} from "@/backend/database/users/read/read-users";
import type { UserWriter } from "@/backend/database/users/write/write-users";
import type { OwnerSetupConfiguration } from "./owner-setup-configuration";
import type { OwnerSetupContext } from "./owner-setup-context";

interface AuthenticationUser {
  id: string;
}

interface AuthenticationRecord {
  user: AuthenticationUser;
}

export interface OwnerAuthenticationGateway {
  findUserById(userId: string): Promise<AuthenticationUser | null>;
  findUserByEmail(email: string): Promise<AuthenticationRecord | null>;
  signIn(email: string, password: string): Promise<void>;
  signUp(
    email: string,
    username: string,
    password: string,
  ): Promise<AuthenticationUser>;
  deleteUserSessions(userId: string): Promise<void>;
}

export interface SetupOwnerDependencies {
  authentication: OwnerAuthenticationGateway;
  ownerSetupContext: OwnerSetupContext;
  userReader: Pick<UserReader, "getOwner">;
  userWriter: Pick<UserWriter, "createOrLinkOwnerAfterSignup">;
}

export type SetupOwnerResult =
  | {
      status: "already-linked";
      owner: StoredUser;
    }
  | {
      status: "ready";
      owner: StoredUser;
    };

/** Create, repair, or confirm the single owner without command-line concerns. */
export async function setupOwner(
  configuration: OwnerSetupConfiguration,
  dependencies: SetupOwnerDependencies,
): Promise<SetupOwnerResult> {
  const { authentication, ownerSetupContext, userReader, userWriter } =
    dependencies;
  const existingOwner = await userReader.getOwner();

  if (existingOwner?.auth_provider_user_id) {
    const authUser = await authentication.findUserById(
      existingOwner.auth_provider_user_id,
    );

    if (!authUser) {
      throw new Error(
        "The owner profile points to a missing authentication account.",
      );
    }

    return { status: "already-linked", owner: existingOwner };
  }

  const existingAuthRecord = await authentication.findUserByEmail(
    configuration.email,
  );
  const ownerAuthUserId = await ownerSetupContext.run(
    {
      email: configuration.email,
      username: configuration.username,
    },
    async () => {
      if (existingAuthRecord) {
        await authentication.signIn(
          configuration.email,
          configuration.password,
        );
        await userWriter.createOrLinkOwnerAfterSignup({
          authProviderUserId: existingAuthRecord.user.id,
          email: configuration.email,
          username: configuration.username,
        });
        return existingAuthRecord.user.id;
      }

      const authUser = await authentication.signUp(
        configuration.email,
        configuration.username,
        configuration.password,
      );
      return authUser.id;
    },
  );

  await authentication.deleteUserSessions(ownerAuthUserId);

  const owner = await userReader.getOwner();
  if (!owner || owner.auth_provider_user_id !== ownerAuthUserId) {
    throw new Error("Owner setup completed without a linked owner profile.");
  }

  return { status: "ready", owner };
}

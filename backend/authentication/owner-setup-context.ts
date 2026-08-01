import { AsyncLocalStorage } from "node:async_hooks";

interface OwnerSetupIdentity {
  email: string;
  username: string;
}

const ownerSetupStorage = new AsyncLocalStorage<OwnerSetupIdentity>();

/**
 * Marks one server-side Better Auth call as the trusted owner setup flow.
 * Browser requests cannot enter this context.
 */
export function runWithOwnerSetupContext<T>(
  identity: OwnerSetupIdentity,
  action: () => Promise<T>,
): Promise<T> {
  return ownerSetupStorage.run(identity, action);
}

export function getOwnerSetupIdentity(): OwnerSetupIdentity | null {
  return ownerSetupStorage.getStore() ?? null;
}

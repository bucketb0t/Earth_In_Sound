import { AsyncLocalStorage } from "node:async_hooks";

interface OwnerSetupIdentity {
  email: string;
  username: string;
}

const ownerSetupStorage = new AsyncLocalStorage<OwnerSetupIdentity>();

/** Trusted server-only owner setup context; browser requests cannot enter it. */
export function runWithOwnerSetupContext<T>(
  identity: OwnerSetupIdentity,
  action: () => Promise<T>,
): Promise<T> {
  return ownerSetupStorage.run(identity, action);
}

export function getOwnerSetupIdentity(): OwnerSetupIdentity | null {
  return ownerSetupStorage.getStore() ?? null;
}

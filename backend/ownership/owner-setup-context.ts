import { AsyncLocalStorage } from "node:async_hooks";

export interface OwnerSetupIdentity {
  email: string;
  username: string;
}

export interface OwnerSetupContext {
  run<T>(identity: OwnerSetupIdentity, action: () => Promise<T>): Promise<T>;
  getIdentity(): OwnerSetupIdentity | null;
}

const ownerSetupStorage = new AsyncLocalStorage<OwnerSetupIdentity>();

/** Restrict owner bootstrap privileges to one trusted asynchronous operation. */
export const ownerSetupContext: OwnerSetupContext = Object.freeze({
  run<T>(identity: OwnerSetupIdentity, action: () => Promise<T>): Promise<T> {
    return ownerSetupStorage.run(identity, action);
  },
  getIdentity: () => ownerSetupStorage.getStore() ?? null,
});

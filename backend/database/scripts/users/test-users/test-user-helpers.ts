export function assert(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`Test failed: ${message}`);
  }
}

export async function assertRejects(
  action: () => Promise<unknown>,
  failureMessage: string,
): Promise<void> {
  /* Use message-specific assertions when the rejection reason matters. */
  try {
    await action();
  } catch {
    return;
  }

  throw new Error(`Test failed: ${failureMessage}`);
}

/** Assert that an async action fails with the expected message. */
export async function assertRejectsWithMessage(
  action: () => Promise<unknown>,
  expectedMessage: string,
  failureMessage: string,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    assert(
      error instanceof Error && error.message === expectedMessage,
      failureMessage,
    );
    return;
  }

  throw new Error(`Test failed: ${failureMessage}`);
}

/** Assert that a synchronous action throws. */
export function assertThrows(
  action: () => unknown,
  failureMessage: string,
): void {
  try {
    action();
  } catch {
    return;
  }

  throw new Error(`Test failed: ${failureMessage}`);
}

/** Assert that a synchronous action throws the expected message. */
export function assertThrowsWithMessage(
  action: () => unknown,
  expectedMessage: string,
  failureMessage: string,
): void {
  try {
    action();
  } catch (error) {
    assert(
      error instanceof Error && error.message === expectedMessage,
      failureMessage,
    );
    return;
  }

  throw new Error(`Test failed: ${failureMessage}`);
}

/**
 * Tiny assertion helper for script-based tests.
 *
 * Throws a normal Error so these scripts can run with plain tsx instead of a
 * full test runner.
 */
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Test failed: ${message}`);
  }
}

export async function assertRejects(
  action: () => Promise<unknown>,
  failureMessage: string,
): Promise<void> {
  try {
    await action();
  } catch {
    return;
  }

  throw new Error(`Test failed: ${failureMessage}`);
}

/**
 * Runs an action that should fail and verifies the exact error message.
 *
 * This is useful for permission/validation tests, where success means "the
 * dangerous action was rejected for the reason we expected."
 */
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

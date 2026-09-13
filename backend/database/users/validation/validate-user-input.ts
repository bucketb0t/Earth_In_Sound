/** Normalize lookup keys for case-insensitive search and uniqueness. */
export function toLookupValue(value: string): string {
  return value.toLowerCase();
}

/** Release a deleted user's email while retaining its profile row. */
export function getDeletedEmailLookup(
  userId: string,
  deletedAt: number,
): string {
  return `deleted-email:${userId}:${deletedAt}`;
}

/** Validate email format only; mailbox ownership requires email verification. */
export function requireValidEmail(email: string): string {
  const cleanedEmail = email.trim();

  if (!cleanedEmail) {
    throw new Error("Email is required.");
  }

  if (/\s/.test(cleanedEmail)) {
    throw new Error("Email cannot contain spaces.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  return cleanedEmail;
}

/** Allow letters, numbers, and ._- separators; separators cannot touch or appear at either end. */
export function requireValidUsername(username: string): string {
  const cleanedUsername = username.trim();

  if (!cleanedUsername) {
    throw new Error("Username is required.");
  }

  if (cleanedUsername.length < 3 || cleanedUsername.length > 32) {
    throw new Error("Username must be between 3 and 32 characters.");
  }

  if (
    !/^[A-Za-z0-9](?:[A-Za-z0-9]|[-_.](?=[A-Za-z0-9]))*$/.test(cleanedUsername)
  ) {
    throw new Error(
      'Username may use letters, numbers, "-", "_" and ".", but separators cannot touch.',
    );
  }

  return cleanedUsername;
}

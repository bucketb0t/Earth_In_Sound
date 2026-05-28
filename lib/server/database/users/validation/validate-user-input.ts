/**
 * Converts values into search/uniqueness keys.
 */
export function toLookupValue(value: string): string {
  return value.toLowerCase();
}

/**
 * Unique replacement email lookup for deleted user rows.
 */
export function getDeletedEmailLookup(
  userId: string,
  deletedAt: number,
): string {
  return `deleted-email:${userId}:${deletedAt}`;
}

/**
 * Validates the visible email value.
 * The original casing is kept for display, while email_lookup handles searches.
 */
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

/**
 * Usernames may contain letters, numbers, "-", "_" and ".".
 * A separator cannot appear first, last, or directly next to another separator.
 */
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

/**
 * Converts values into search/uniqueness keys.
 *
 * The app keeps the original visible value for display, but lookup fields use
 * lowercase so "Andrew" and "andrew" cannot become two different accounts.
 */
export function toLookupValue(value: string): string {
  return value.toLowerCase();
}

/**
 * Unique replacement email lookup for deleted user rows.
 *
 * Deleted rows stay in the database, but their original email_lookup must be
 * released so the same real email can sign up again later.
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
 *
 * This is basic format validation, not proof that the mailbox exists. Real
 * mailbox ownership should be proven later with email verification from the
 * auth provider.
 */
export function requireValidEmail(email: string): string {
  /*
   * Trim accidental edge spaces but reject spaces inside the address.
   */
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
 *
 * This avoids usernames made only from punctuation or hard-to-read sequences
 * like "john..doe", while still allowing common handle styles.
 */
export function requireValidUsername(username: string): string {
  /*
   * Visible username is preserved exactly except for accidental edge spaces.
   */
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

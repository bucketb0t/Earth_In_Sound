export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_PATTERN = "\\S+";
export const PASSWORD_WHITESPACE_MESSAGE = "Password cannot contain spaces.";

/** Require a bounded password without spaces, tabs, or line breaks. */
export function requireValidPassword(
  password: string,
  fieldName = "Password",
): string {
  if (/\s/.test(password)) {
    throw new Error(`${fieldName} cannot contain spaces.`);
  }

  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new Error(
      `${fieldName} must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`,
    );
  }

  return password;
}

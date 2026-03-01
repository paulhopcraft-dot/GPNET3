/**
 * Password Strength Validation
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  digit: /[0-9]/,
  special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
};

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }

  if (!PASSWORD_REGEX.uppercase.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!PASSWORD_REGEX.lowercase.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!PASSWORD_REGEX.digit.test(password)) {
    errors.push("Password must contain at least one digit");
  }

  if (!PASSWORD_REGEX.special.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;':\",./<>?)");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

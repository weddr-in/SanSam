/**
 * Phone number utilities for Indian mobile numbers
 * Format: 10 digits starting with 6-9
 */

export const PHONE_REGEX = /^[6-9][0-9]{9}$/;

/**
 * Format phone number for display with space after 5th digit
 * Example: "9876543210" -> "98765 43210"
 */
export function formatPhone(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  // Limit to 10 digits
  const limited = digits.slice(0, 10);

  // Add space after 5th digit
  if (limited.length > 5) {
    return `${limited.slice(0, 5)} ${limited.slice(5)}`;
  }

  return limited;
}

/**
 * Validate Indian mobile number
 * Must be exactly 10 digits starting with 6-9
 */
export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return PHONE_REGEX.test(digits);
}

/**
 * Get raw phone digits (removes formatting)
 */
export function getRawPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

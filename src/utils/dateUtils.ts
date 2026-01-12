/**
 * Calculates age based on birthdate.
 * Handles leap years and validates that the date is not in the future.
 * @param birthDateStr - Date string in YYYY-MM-DD or other standard format
 * @returns { number | null } - Age in years or null if invalid/future date
 */
export function calculateAge(birthDateStr: string | null | undefined): number | null {
  if (!birthDateStr) return null;

  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  
  // Future date validation
  if (birthDate > today) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  // If birthday hasn't occurred yet this year, subtract one year
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
}

/**
 * Validates if a date string is not in the future.
 * @param dateStr - Date string
 * @returns { boolean }
 */
export function isNotFutureDate(dateStr: string): boolean {
  if (!dateStr) return true;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Only compare date part
  return date <= today;
}

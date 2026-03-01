// Date formatting utilities for consistent date display across components

/**
 * Formats a week number into month/year format based on injury date
 * @param weekNumber - Week number since injury (0-based)
 * @param injuryDate - The date of injury as a string or Date
 * @returns Formatted string like "01/25" for January 2025
 */
export function formatWeekAsMonthYear(weekNumber: number, injuryDate: string | Date): string {
  const injury = new Date(injuryDate);
  if (isNaN(injury.getTime())) {
    return `W${weekNumber}`; // Fallback to week format if invalid date
  }

  // Calculate the date for this week
  const targetDate = new Date(injury);
  targetDate.setDate(targetDate.getDate() + (weekNumber * 7));

  // Format as MM/YY
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const year = String(targetDate.getFullYear()).slice(-2);

  return `${month}/${year}`;
}

/**
 * Formats a date into month/year format
 * @param date - Date as string or Date object
 * @returns Formatted string like "01/25" for January 2025
 */
export function formatDateAsMonthYear(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid';
  }

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);

  return `${month}/${year}`;
}

/**
 * Legacy week formatter for backwards compatibility
 */
export function formatWeekNumber(weekNumber: number): string {
  return `W${weekNumber}`;
}
// Date utilities - Simple approach using system/local time
// Database stores dates as YYYY-MM-DD strings, so we just need to extract the date part correctly

/**
 * Get current date/time (uses system time)
 */
export function getNigerianDate(): Date {
  return new Date();
}

/**
 * Get start of day (simple - just sets hours to 0)
 */
export function getStartOfDayNigerian(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day (simple - just sets hours to 23:59:59)
 */
export function getEndOfDayNigerian(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Convert date to YYYY-MM-DD string for API calls
 * Uses local date components (simple approach)
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


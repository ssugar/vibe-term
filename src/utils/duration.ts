/**
 * Format a duration in milliseconds to human-readable string.
 * Following CONTEXT.md spec:
 * - Under 1 minute: "< 1 min"
 * - Under 1 hour: "{N} min" (e.g., "45 min")
 * - Under 1 day: "{H} hr {M} min" or "{H} hr" if M is 0
 * - 1+ days: "{D} day(s) {H} hr" or "{D} day(s)" if H is 0
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // Under 1 minute
  if (minutes < 1) {
    return '< 1 min';
  }

  // Under 1 hour: just minutes
  if (hours < 1) {
    return `${minutes} min`;
  }

  // Under 1 day: hours and minutes
  if (days < 1) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }
    return `${hours} hr ${remainingMinutes} min`;
  }

  // 1+ days: days and hours
  const remainingHours = hours % 24;
  const dayLabel = days === 1 ? 'day' : 'days';
  if (remainingHours === 0) {
    return `${days} ${dayLabel}`;
  }
  return `${days} ${dayLabel} ${remainingHours} hr`;
}

/**
 * Calculate duration from a start date to now.
 * Returns formatted duration string.
 */
export function formatDurationSince(startDate: Date): string {
  const now = Date.now();
  const start = startDate.getTime();
  return formatDuration(now - start);
}

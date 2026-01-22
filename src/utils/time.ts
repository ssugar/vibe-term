/**
 * Format a date as relative time (e.g., "2s ago", "1m ago", "5m ago").
 * Returns "never" if date is null.
 */
export function formatRelativeTime(date: Date | null): string {
  if (!date) return 'never';

  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

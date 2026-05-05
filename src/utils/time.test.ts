import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatRelativeTime } from './time.js';

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "never" when date is null', () => {
    expect(formatRelativeTime(null)).toBe('never');
  });

  it('formats sub-minute differences in seconds', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(formatRelativeTime(new Date(now.getTime() - 2_000))).toBe('2s ago');
    expect(formatRelativeTime(new Date(now.getTime() - 59_000))).toBe('59s ago');
  });

  it('formats sub-hour differences in minutes', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(formatRelativeTime(new Date(now.getTime() - 60_000))).toBe('1m ago');
    expect(formatRelativeTime(new Date(now.getTime() - 30 * 60_000))).toBe('30m ago');
  });

  it('formats hour-plus differences in hours', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(formatRelativeTime(new Date(now.getTime() - 60 * 60_000))).toBe('1h ago');
    expect(formatRelativeTime(new Date(now.getTime() - 5 * 60 * 60_000))).toBe('5h ago');
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatDuration, formatDurationSince } from './duration.js';

describe('formatDuration', () => {
  it('returns "< 1 min" for durations under one minute', () => {
    expect(formatDuration(0)).toBe('< 1 min');
    expect(formatDuration(500)).toBe('< 1 min');
    expect(formatDuration(59_999)).toBe('< 1 min');
  });

  it('returns minutes only for sub-hour durations', () => {
    expect(formatDuration(60_000)).toBe('1 min');
    expect(formatDuration(45 * 60_000)).toBe('45 min');
    expect(formatDuration(59 * 60_000)).toBe('59 min');
  });

  it('returns hours only when minutes remainder is zero', () => {
    expect(formatDuration(60 * 60_000)).toBe('1 hr');
    expect(formatDuration(3 * 60 * 60_000)).toBe('3 hr');
  });

  it('returns hours and minutes when both nonzero and under a day', () => {
    expect(formatDuration(60 * 60_000 + 30 * 60_000)).toBe('1 hr 30 min');
    expect(formatDuration(23 * 60 * 60_000 + 59 * 60_000)).toBe('23 hr 59 min');
  });

  it('returns days only when hours remainder is zero', () => {
    expect(formatDuration(24 * 60 * 60_000)).toBe('1 day');
    expect(formatDuration(2 * 24 * 60 * 60_000)).toBe('2 days');
  });

  it('returns days and hours for multi-day durations', () => {
    expect(formatDuration(25 * 60 * 60_000)).toBe('1 day 1 hr');
    expect(formatDuration(50 * 60 * 60_000)).toBe('2 days 2 hr');
  });
});

describe('formatDurationSince', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats elapsed time relative to now', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const tenMinAgo = new Date(now.getTime() - 10 * 60_000);
    expect(formatDurationSince(tenMinAgo)).toBe('10 min');
  });
});

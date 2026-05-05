import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractModel, detectStatus } from './statusDetector.js';
import type { LogEntry } from './logPathService.js';

describe('extractModel', () => {
  it('returns null for empty / undefined input', () => {
    expect(extractModel(undefined)).toBeNull();
    expect(extractModel('')).toBeNull();
    expect(extractModel('   ')).toBeNull();
  });

  it('detects opus, haiku, sonnet variants', () => {
    expect(extractModel('claude-opus-4-7')).toBe('opus');
    expect(extractModel('claude-haiku-4-5')).toBe('haiku');
    expect(extractModel('claude-sonnet-4-6')).toBe('sonnet');
    expect(extractModel('CLAUDE-OPUS-4-7')).toBe('opus');
  });

  it('prefers opus over sonnet/haiku in mixed strings', () => {
    expect(extractModel('claude-opus-with-sonnet-fallback')).toBe('opus');
  });

  it('returns null for unknown models', () => {
    expect(extractModel('gpt-4')).toBeNull();
    expect(extractModel('claude-instant')).toBeNull();
  });
});

describe('detectStatus', () => {
  const now = new Date('2026-01-01T12:00:00Z');

  afterEach(() => {
    vi.useRealTimers();
  });

  function freezeTime(t: Date = now) {
    vi.useFakeTimers();
    vi.setSystemTime(t);
  }

  it('returns working for user entries', () => {
    freezeTime();
    const entry = { type: 'user' } as unknown as LogEntry;
    expect(detectStatus(entry, now)).toBe('working');
  });

  it('returns idle for summary entries', () => {
    freezeTime();
    const entry = { type: 'summary' } as unknown as LogEntry;
    expect(detectStatus(entry, now)).toBe('idle');
  });

  it('returns idle for assistant + end_turn', () => {
    freezeTime();
    const entry = {
      type: 'assistant',
      message: { stop_reason: 'end_turn' },
    } as unknown as LogEntry;
    expect(detectStatus(entry, now)).toBe('idle');
  });

  it('returns working for assistant + tool_use within threshold', () => {
    freezeTime();
    const entry = {
      type: 'assistant',
      message: { stop_reason: 'tool_use' },
    } as unknown as LogEntry;
    // 4s elapsed (under 5s threshold)
    const entryTime = new Date(now.getTime() - 4_000);
    expect(detectStatus(entry, entryTime)).toBe('working');
  });

  it('returns blocked for assistant + tool_use over threshold', () => {
    freezeTime();
    const entry = {
      type: 'assistant',
      message: { stop_reason: 'tool_use' },
    } as unknown as LogEntry;
    // 6s elapsed (over 5s threshold)
    const entryTime = new Date(now.getTime() - 6_000);
    expect(detectStatus(entry, entryTime)).toBe('blocked');
  });

  it('treats elapsed exactly at threshold as still working (boundary)', () => {
    freezeTime();
    const entry = {
      type: 'assistant',
      message: { stop_reason: 'tool_use' },
    } as unknown as LogEntry;
    const entryTime = new Date(now.getTime() - 5_000);
    expect(detectStatus(entry, entryTime)).toBe('working');
  });

  it('returns working when stop_reason is null/undefined (still generating)', () => {
    freezeTime();
    const e1 = {
      type: 'assistant',
      message: { stop_reason: null },
    } as unknown as LogEntry;
    const e2 = { type: 'assistant', message: {} } as unknown as LogEntry;
    expect(detectStatus(e1, now)).toBe('working');
    expect(detectStatus(e2, now)).toBe('working');
  });

  it('returns idle for unexpected stop_reason values (e.g. max_tokens)', () => {
    freezeTime();
    const entry = {
      type: 'assistant',
      message: { stop_reason: 'max_tokens' },
    } as unknown as LogEntry;
    expect(detectStatus(entry, now)).toBe('idle');
  });
});

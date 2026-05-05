import { describe, it, expect } from 'vitest';
import { createJsonOutput, getVersion } from './json.js';

describe('getVersion', () => {
  it('returns a non-empty version string from package.json', () => {
    const v = getVersion();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
    // Must look like a semver-ish or fallback "0.0.0"
    expect(v).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('createJsonOutput', () => {
  it('produces the canonical envelope shape with success defaults', () => {
    const start = process.hrtime.bigint();
    const out = createJsonOutput('audit', { foo: 1 }, { success: true, startTime: start });

    expect(out.success).toBe(true);
    expect(out.data).toEqual({ foo: 1 });
    expect(out.errors).toEqual([]);
    expect(out.suggestions).toEqual([]);
    expect(out.meta.command).toBe('audit');
    expect(out.meta.version).toBe(getVersion());
    expect(typeof out.meta.timestamp).toBe('string');
    expect(new Date(out.meta.timestamp).toString()).not.toBe('Invalid Date');
    expect(typeof out.meta.duration_ms).toBe('number');
    expect(out.meta.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('passes through errors and suggestions arrays', () => {
    const start = process.hrtime.bigint();
    const out = createJsonOutput('fix', null, {
      success: false,
      startTime: start,
      errors: [{ category: 'parse', message: 'bad json' }],
      suggestions: [{ action: 'retry', command: 'vibe-term audit', reason: 'rerun' }],
    });

    expect(out.success).toBe(false);
    expect(out.errors).toEqual([{ category: 'parse', message: 'bad json' }]);
    expect(out.suggestions).toEqual([
      { action: 'retry', command: 'vibe-term audit', reason: 'rerun' },
    ]);
  });

  it('rounds duration_ms to 2 decimal places', () => {
    const start = process.hrtime.bigint();
    const out = createJsonOutput('setup', {}, { success: true, startTime: start });
    // Two-decimal rounding: multiply by 100 should be an integer
    expect(out.meta.duration_ms * 100).toBe(Math.round(out.meta.duration_ms * 100));
  });
});

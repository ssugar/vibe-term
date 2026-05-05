import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getContextUsage } from './contextService.js';

const here = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(here, '__fixtures__', name);

describe('getContextUsage', () => {
  it('returns null when path is null', () => {
    expect(getContextUsage(null)).toBeNull();
  });

  it('returns null when file does not exist', () => {
    expect(getContextUsage(join(here, '__fixtures__', 'does-not-exist.jsonl'))).toBeNull();
  });

  it('returns null for an empty transcript', () => {
    expect(getContextUsage(fix('empty.jsonl'))).toBeNull();
  });

  it('returns null when only sidechain entries exist', () => {
    expect(getContextUsage(fix('sidechain-only.jsonl'))).toBeNull();
  });

  it('computes percentage from the last main-agent assistant entry', () => {
    // last main entry: input 2000 + cache_creation 1000 + cache_read 17000 = 20000
    // 20000 / 200000 = 10%
    expect(getContextUsage(fix('normal-session.jsonl'))).toBe(10);
  });

  it('ignores sidechain entries when picking the last main entry', () => {
    // last main entry (req_2): input 3000 + cache_creation 2000 + cache_read 35000 = 40000
    // 40000 / 200000 = 20%
    expect(getContextUsage(fix('mixed-with-sidechain.jsonl'))).toBe(20);
  });
});

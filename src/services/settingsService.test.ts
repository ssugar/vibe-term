import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { formatTimestamp } from './settingsService.js';

describe('formatTimestamp', () => {
  it('formats date as YYYY-MM-DD_HHmmss', () => {
    const d = new Date(2026, 0, 30, 14, 30, 52);
    expect(formatTimestamp(d)).toBe('2026-01-30_143052');
  });

  it('zero-pads single-digit components', () => {
    const d = new Date(2026, 4, 5, 1, 2, 3);
    expect(formatTimestamp(d)).toBe('2026-05-05_010203');
  });
});

describe('settings I/O (with HOME override)', () => {
  let fakeHome: string;
  let claudeDir: string;
  let settingsPath: string;

  beforeEach(async () => {
    fakeHome = await mkdtemp(join(tmpdir(), 'vibe-home-'));
    claudeDir = join(fakeHome, '.claude');
    settingsPath = join(claudeDir, 'settings.json');
    await mkdir(claudeDir, { recursive: true });
    vi.stubEnv('HOME', fakeHome);
    vi.resetModules();
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(fakeHome, { recursive: true, force: true });
  });

  async function loadModule() {
    vi.resetModules();
    return await import('./settingsService.js');
  }

  it('returns {} when settings.json is missing', async () => {
    const mod = await loadModule();
    expect(await mod.readClaudeSettings()).toEqual({});
  });

  it('reads and parses an existing settings.json', async () => {
    await writeFile(settingsPath, JSON.stringify({ env: { FOO: 'bar' } }), 'utf-8');
    const mod = await loadModule();
    expect(await mod.readClaudeSettings()).toEqual({ env: { FOO: 'bar' } });
  });

  it('throws a descriptive error on malformed JSON', async () => {
    await writeFile(settingsPath, '{not json', 'utf-8');
    const mod = await loadModule();
    await expect(mod.readClaudeSettings()).rejects.toThrow(/Invalid JSON/);
  });

  it('writes settings as pretty-printed JSON', async () => {
    const mod = await loadModule();
    await mod.writeClaudeSettings({ env: { A: '1' } }, { backup: false });
    const content = await readFile(settingsPath, 'utf-8');
    expect(content).toBe(JSON.stringify({ env: { A: '1' } }, null, 2));
  });

  it('creates a backup before overwriting an existing file', async () => {
    await writeFile(settingsPath, JSON.stringify({ original: true }), 'utf-8');
    const mod = await loadModule();
    const backupPath = await mod.writeClaudeSettings({ replaced: true });
    expect(backupPath).not.toBeNull();
    expect(backupPath).toMatch(/settings\.json\.vibe-term-backup\./);

    const backupContent = await readFile(backupPath as string, 'utf-8');
    expect(JSON.parse(backupContent)).toEqual({ original: true });

    const newContent = await readFile(settingsPath, 'utf-8');
    expect(JSON.parse(newContent)).toEqual({ replaced: true });
  });

  it('skips backup when backup option is false', async () => {
    await writeFile(settingsPath, JSON.stringify({ original: true }), 'utf-8');
    const mod = await loadModule();
    const backupPath = await mod.writeClaudeSettings({ replaced: true }, { backup: false });
    expect(backupPath).toBeNull();
    const entries = await readdir(claudeDir);
    expect(entries.some((e) => e.includes('vibe-term-backup'))).toBe(false);
  });

  it('returns null backup path when no existing settings file', async () => {
    const mod = await loadModule();
    const backupPath = await mod.writeClaudeSettings({ a: 1 });
    expect(backupPath).toBeNull();
  });

  it('settingsFileExists reports presence accurately', async () => {
    const mod = await loadModule();
    expect(await mod.settingsFileExists()).toBe(false);
    await writeFile(settingsPath, '{}', 'utf-8');
    expect(await mod.settingsFileExists()).toBe(true);
  });

  it('getSettingsPath returns the HOME-relative path', async () => {
    const mod = await loadModule();
    expect(mod.getSettingsPath()).toBe(settingsPath);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  expandTilde,
  directoryExists,
  createDirectory,
  getDirectoryCompletions,
} from './directoryService.js';

describe('expandTilde', () => {
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.HOME;
    process.env.HOME = '/home/test-user';
  });

  afterEach(() => {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
  });

  it('expands ~ to HOME', () => {
    expect(expandTilde('~')).toBe('/home/test-user');
    expect(expandTilde('~/projects')).toBe('/home/test-user/projects');
  });

  it('leaves paths without leading ~ unchanged', () => {
    expect(expandTilde('/usr/local')).toBe('/usr/local');
    expect(expandTilde('relative/path')).toBe('relative/path');
  });
});

describe('directoryExists', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vibe-dir-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns true for an existing directory', () => {
    expect(directoryExists(dir)).toBe(true);
  });

  it('returns false for a non-existent path', () => {
    expect(directoryExists(join(dir, 'nope'))).toBe(false);
  });
});

describe('createDirectory', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vibe-mkdir-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('creates nested directories recursively', () => {
    const target = join(dir, 'a', 'b', 'c');
    createDirectory(target);
    expect(existsSync(target)).toBe(true);
  });

  it('does not throw if directory already exists', () => {
    createDirectory(dir);
    expect(() => createDirectory(dir)).not.toThrow();
  });
});

describe('getDirectoryCompletions', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'vibe-comp-'));
    await mkdir(join(dir, 'apple'));
    await mkdir(join(dir, 'avocado'));
    await mkdir(join(dir, 'banana'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns [] for empty input', () => {
    expect(getDirectoryCompletions('')).toEqual([]);
    expect(getDirectoryCompletions('   ')).toEqual([]);
  });

  it('returns all directories when path ends with /', () => {
    const results = getDirectoryCompletions(`${dir}/`);
    expect(results).toEqual(
      [join(dir, 'apple'), join(dir, 'avocado'), join(dir, 'banana')].sort(),
    );
  });

  it('filters by basename prefix', () => {
    const results = getDirectoryCompletions(join(dir, 'a'));
    expect(results).toEqual([join(dir, 'apple'), join(dir, 'avocado')]);
  });

  it('returns [] when search dir does not exist', () => {
    expect(getDirectoryCompletions('/totally/not/a/real/path/xyz')).toEqual([]);
  });
});

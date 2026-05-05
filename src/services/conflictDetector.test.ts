import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { classifyProject } from './conflictDetector.js';

let dir: string;
let projectPath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'vibe-conflict-'));
  projectPath = join(dir, 'project');
  await mkdir(join(projectPath, '.claude'), { recursive: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('classifyProject', () => {
  it('passes when neither settings file exists', async () => {
    const result = await classifyProject(projectPath, null, null);
    expect(result.status).toBe('pass');
    expect(result.issues).toEqual([]);
    expect(result.path).toBe(projectPath);
  });

  it('passes when settings file exists but has no hooks', async () => {
    const settingsPath = join(projectPath, '.claude/settings.json');
    await writeFile(settingsPath, JSON.stringify({ env: { FOO: 'bar' } }), 'utf-8');
    const result = await classifyProject(projectPath, settingsPath, null);
    expect(result.status).toBe('pass');
  });

  it('passes when hooks object is present but empty', async () => {
    const settingsPath = join(projectPath, '.claude/settings.json');
    await writeFile(settingsPath, JSON.stringify({ hooks: {} }), 'utf-8');
    const result = await classifyProject(projectPath, settingsPath, null);
    expect(result.status).toBe('pass');
  });

  it('warns when shared settings has hooks', async () => {
    const settingsPath = join(projectPath, '.claude/settings.json');
    await writeFile(
      settingsPath,
      JSON.stringify({
        hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'foo.sh' }] }] },
      }),
      'utf-8',
    );
    const result = await classifyProject(projectPath, settingsPath, null);
    expect(result.status).toBe('warn');
    expect(result.issues).toContain('Project has shared hooks (.claude/settings.json)');
  });

  it('warns when local settings has hooks', async () => {
    const localPath = join(projectPath, '.claude/settings.local.json');
    await writeFile(
      localPath,
      JSON.stringify({
        hooks: { Stop: [{ hooks: [{ type: 'command', command: 'foo.sh' }] }] },
      }),
      'utf-8',
    );
    const result = await classifyProject(projectPath, null, localPath);
    expect(result.status).toBe('warn');
    expect(result.issues).toContain('Project has local hooks (.claude/settings.local.json)');
  });

  it('warns and reports both when both files have hooks', async () => {
    const settingsPath = join(projectPath, '.claude/settings.json');
    const localPath = join(projectPath, '.claude/settings.local.json');
    await writeFile(
      settingsPath,
      JSON.stringify({
        hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'foo.sh' }] }] },
      }),
      'utf-8',
    );
    await writeFile(
      localPath,
      JSON.stringify({
        hooks: { Stop: [{ hooks: [{ type: 'command', command: 'bar.sh' }] }] },
      }),
      'utf-8',
    );
    const result = await classifyProject(projectPath, settingsPath, localPath);
    expect(result.status).toBe('warn');
    expect(result.issues).toHaveLength(2);
  });

  it('fails on malformed shared settings JSON', async () => {
    const settingsPath = join(projectPath, '.claude/settings.json');
    await writeFile(settingsPath, '{not valid json', 'utf-8');
    const result = await classifyProject(projectPath, settingsPath, null);
    expect(result.status).toBe('fail');
    expect(result.issues).toEqual(['Malformed .claude/settings.json']);
  });

  it('fails on malformed local settings JSON', async () => {
    const localPath = join(projectPath, '.claude/settings.local.json');
    await writeFile(localPath, '{', 'utf-8');
    const result = await classifyProject(projectPath, null, localPath);
    expect(result.status).toBe('fail');
    expect(result.issues).toEqual(['Malformed .claude/settings.local.json']);
  });
});

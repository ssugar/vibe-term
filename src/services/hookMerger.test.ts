import { describe, it, expect } from 'vitest';
import {
  isVibeTermInstalled,
  mergeHooks,
  HOOK_EVENTS,
  VIBE_TERM_HOOK_SCRIPT,
} from './hookMerger.js';
import type { ClaudeSettings } from './settingsService.js';

describe('isVibeTermInstalled', () => {
  it('returns false on empty settings', () => {
    expect(isVibeTermInstalled({})).toBe(false);
  });

  it('returns false when hooks object is missing', () => {
    expect(isVibeTermInstalled({ env: { FOO: 'bar' } })).toBe(false);
  });

  it('returns false when hooks have other tools but no vibe-term', () => {
    const settings: ClaudeSettings = {
      hooks: {
        SessionStart: [{ hooks: [{ type: 'command', command: '~/.other-tool/hook.sh' }] }],
      },
    };
    expect(isVibeTermInstalled(settings)).toBe(false);
  });

  it('returns true when vibe-term hook is present in any event', () => {
    const settings: ClaudeSettings = {
      hooks: {
        Stop: [{ hooks: [{ type: 'command', command: VIBE_TERM_HOOK_SCRIPT }] }],
      },
    };
    expect(isVibeTermInstalled(settings)).toBe(true);
  });

});

describe('mergeHooks', () => {
  it('adds vibe-term hooks to all known events when starting empty', () => {
    const merged = mergeHooks({});
    expect(merged.hooks).toBeDefined();
    for (const event of HOOK_EVENTS) {
      const configs = merged.hooks![event];
      expect(configs).toHaveLength(1);
      expect(configs![0].hooks[0].command).toBe(VIBE_TERM_HOOK_SCRIPT);
    }
  });

  it('preserves non-hook fields in the settings object', () => {
    const original: ClaudeSettings = {
      env: { FOO: 'bar' },
      attribution: { author: 'me' },
    };
    const merged = mergeHooks(original);
    expect(merged.env).toEqual({ FOO: 'bar' });
    expect(merged.attribution).toEqual({ author: 'me' });
  });

  it('appends to existing hook arrays without clobbering them', () => {
    const existing: ClaudeSettings = {
      hooks: {
        SessionStart: [{ hooks: [{ type: 'command', command: '~/.other-tool/hook.sh' }] }],
      },
    };
    const merged = mergeHooks(existing);
    const sessionStart = merged.hooks!.SessionStart!;
    expect(sessionStart).toHaveLength(2);
    expect(sessionStart[0].hooks[0].command).toBe('~/.other-tool/hook.sh');
    expect(sessionStart[1].hooks[0].command).toBe(VIBE_TERM_HOOK_SCRIPT);
  });

  it('adds matcher "*" only on tool-event hooks', () => {
    const merged = mergeHooks({});
    expect(merged.hooks!.PreToolUse![0].matcher).toBe('*');
    expect(merged.hooks!.PostToolUse![0].matcher).toBe('*');
    expect(merged.hooks!.PostToolUseFailure![0].matcher).toBe('*');
    expect(merged.hooks!.SessionStart![0].matcher).toBeUndefined();
    expect(merged.hooks!.Stop![0].matcher).toBeUndefined();
    expect(merged.hooks!.Notification![0].matcher).toBeUndefined();
  });

  it('does not mutate the input settings object', () => {
    const original: ClaudeSettings = {
      hooks: {
        SessionStart: [{ hooks: [{ type: 'command', command: '~/.other-tool/hook.sh' }] }],
      },
    };
    const snapshot = JSON.stringify(original);
    mergeHooks(original);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it('produces an installed-state result that round-trips with isVibeTermInstalled', () => {
    const merged = mergeHooks({});
    expect(isVibeTermInstalled(merged)).toBe(true);
  });
});

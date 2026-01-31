/**
 * Hook Merger Service
 *
 * Provides utilities for detecting existing vibe-term hook installations
 * and intelligently merging hooks into Claude settings without clobbering
 * existing hooks from other tools.
 */

import type { ClaudeSettings, HookConfig } from './settingsService.js';

/**
 * Path to the vibe-term hook script.
 * Uses ~ which Claude expands at runtime.
 */
export const VIBE_TERM_HOOK_SCRIPT = '~/.vibe-term/status-hook.sh';

/**
 * All Claude Code hook events.
 * These are the 11 hook points where vibe-term needs to receive notifications.
 */
export const HOOK_EVENTS = [
  'SessionStart',
  'UserPromptSubmit',
  'PermissionRequest',
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'Stop',
  'SessionEnd',
  'SubagentStart',
  'SubagentStop',
  'Notification',
] as const;

/**
 * Type for hook event names.
 */
export type HookEvent = (typeof HOOK_EVENTS)[number];

/**
 * Tool events that require a matcher.
 * These events fire for specific tool types, so we use '*' to catch all tools.
 */
const TOOL_EVENTS: ReadonlySet<string> = new Set([
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
]);

/**
 * Check if vibe-term hooks are already installed in Claude settings.
 *
 * @param settings - The Claude settings object to check
 * @returns true if any hook event contains the vibe-term hook script
 */
export function isVibeTermInstalled(settings: ClaudeSettings): boolean {
  if (!settings.hooks) {
    return false;
  }

  for (const event of HOOK_EVENTS) {
    const hookConfigs = settings.hooks[event];
    if (!hookConfigs) {
      continue;
    }

    for (const config of hookConfigs) {
      for (const hook of config.hooks) {
        if (hook.command.includes(VIBE_TERM_HOOK_SCRIPT)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Create a hook configuration for vibe-term.
 *
 * @param event - The hook event name
 * @returns A HookConfig object for the vibe-term hook script
 */
function createHookConfig(event: string): HookConfig {
  const config: HookConfig = {
    hooks: [
      {
        type: 'command',
        command: VIBE_TERM_HOOK_SCRIPT,
      },
    ],
  };

  // Tool events need a matcher to specify which tools to hook
  // We use '*' to match all tools
  if (TOOL_EVENTS.has(event)) {
    config.matcher = '*';
  }

  return config;
}

/**
 * Merge vibe-term hooks into Claude settings.
 *
 * This function adds vibe-term's hook configuration to all required events
 * without clobbering existing hooks from other tools. The vibe-term hooks
 * are appended to any existing hook arrays.
 *
 * @param settings - The current Claude settings
 * @returns A new settings object with vibe-term hooks merged in
 */
export function mergeHooks(settings: ClaudeSettings): ClaudeSettings {
  // Create shallow copy of settings
  const merged: ClaudeSettings = { ...settings };

  // Create shallow copy of hooks or empty object
  merged.hooks = { ...settings.hooks };

  // Add vibe-term hooks to each event
  for (const event of HOOK_EVENTS) {
    // Get existing array for this event (or empty array)
    const existingConfigs = merged.hooks[event] ?? [];

    // Create vibe-term hook config for this event
    const vibeTermConfig = createHookConfig(event);

    // Append vibe-term config to existing array
    merged.hooks[event] = [...existingConfigs, vibeTermConfig];
  }

  return merged;
}

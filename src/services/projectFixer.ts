/**
 * Project Fixer Service
 *
 * Provides fix preview generation and application for project hook configurations.
 * Handles backup creation, safe writes, and auto-restore on failure.
 */

import { readFile, writeFile, copyFile } from 'node:fs/promises';
import type { ClaudeSettings } from './settingsService.js';
import { formatTimestamp } from './settingsService.js';
import { mergeHooks, isVibeTermInstalled } from './hookMerger.js';

/**
 * Fix mode determines what operation will be performed.
 * - 'merge': Add vibe-term hooks to existing hooks
 * - 'remove-override': Remove hooks section entirely (restore to global hooks only)
 */
export type FixMode = 'merge' | 'remove-override';

/**
 * Preview of a fix operation before it's applied.
 * Shows what will change without modifying any files.
 */
export interface FixPreview {
  projectPath: string; // Original project path
  settingsPath: string; // Path to settings.json being modified
  mode: FixMode; // What operation will be performed
  beforeHooks: Record<string, unknown> | undefined; // Hooks before fix
  afterHooks: Record<string, unknown> | undefined; // Hooks after fix
  alreadyConfigured: boolean; // true if vibe-term already installed
}

/**
 * Result of applying a fix operation.
 */
export interface FixResult {
  projectPath: string;
  success: boolean;
  backupPath?: string; // Path to backup if created
  error?: string; // Error message if failed
}

/**
 * Generate a preview of what a fix operation will do.
 * This does NOT modify any files - it only shows before/after state.
 *
 * @param projectPath - The project directory path
 * @param settingsPath - Path to the project's settings.json
 * @param mode - The fix mode to preview
 * @returns Preview showing before/after hooks state
 */
export async function generateFixPreview(
  projectPath: string,
  settingsPath: string,
  mode: FixMode
): Promise<FixPreview> {
  // Read and parse settings
  const content = await readFile(settingsPath, 'utf-8');
  const settings = JSON.parse(content) as ClaudeSettings;

  // Extract current hooks
  const beforeHooks = settings.hooks as Record<string, unknown> | undefined;

  if (mode === 'merge') {
    // Check if already configured
    if (isVibeTermInstalled(settings)) {
      return {
        projectPath,
        settingsPath,
        mode,
        beforeHooks,
        afterHooks: beforeHooks, // No change needed
        alreadyConfigured: true,
      };
    }

    // Generate merged hooks
    const merged = mergeHooks(settings);
    const afterHooks = merged.hooks as Record<string, unknown> | undefined;

    return {
      projectPath,
      settingsPath,
      mode,
      beforeHooks,
      afterHooks,
      alreadyConfigured: false,
    };
  }

  // mode === 'remove-override'
  return {
    projectPath,
    settingsPath,
    mode,
    beforeHooks,
    afterHooks: undefined, // Hooks will be removed
    alreadyConfigured: false,
  };
}

/**
 * Apply a fix to a project's settings.json.
 * Creates a backup before writing and auto-restores if the write produces invalid JSON.
 *
 * @param settingsPath - Path to the project's settings.json
 * @param projectPath - The project directory path
 * @param mode - The fix mode to apply
 * @returns Result indicating success/failure with backup path
 */
export async function applyFix(
  settingsPath: string,
  projectPath: string,
  mode: FixMode
): Promise<FixResult> {
  let backupPath: string | undefined;

  // Step 1: Create backup
  try {
    const timestamp = formatTimestamp(new Date());
    backupPath = `${settingsPath}.vibe-term-backup.${timestamp}`;
    await copyFile(settingsPath, backupPath);
  } catch (error) {
    return {
      projectPath,
      success: false,
      error: `Failed to create backup: ${(error as Error).message}`,
    };
  }

  // Step 2: Read current settings
  let settings: ClaudeSettings;
  try {
    const content = await readFile(settingsPath, 'utf-8');
    settings = JSON.parse(content) as ClaudeSettings;
  } catch (error) {
    return {
      projectPath,
      success: false,
      backupPath,
      error: `Failed to read settings: ${(error as Error).message}`,
    };
  }

  // Step 3: Apply fix based on mode
  let newSettings: ClaudeSettings;
  if (mode === 'merge') {
    newSettings = mergeHooks(settings);
  } else {
    // mode === 'remove-override'
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hooks, ...rest } = settings;
    newSettings = rest;
  }

  // Step 4: Write new settings
  try {
    const newContent = JSON.stringify(newSettings, null, 2);
    await writeFile(settingsPath, newContent, 'utf-8');
  } catch (error) {
    return {
      projectPath,
      success: false,
      backupPath,
      error: `Failed to write settings: ${(error as Error).message}`,
    };
  }

  // Step 5: Validate written file (auto-restore if broken)
  try {
    const verifyContent = await readFile(settingsPath, 'utf-8');
    JSON.parse(verifyContent);
  } catch {
    // File is corrupted, restore from backup
    try {
      await copyFile(backupPath, settingsPath);
    } catch {
      // Restore also failed - critical error
      return {
        projectPath,
        success: false,
        backupPath,
        error: 'Settings file corrupted after write, restore from backup also failed',
      };
    }
    return {
      projectPath,
      success: false,
      backupPath,
      error: 'Settings file corrupted after write, restored from backup',
    };
  }

  // Step 6: Success
  return {
    projectPath,
    success: true,
    backupPath,
  };
}

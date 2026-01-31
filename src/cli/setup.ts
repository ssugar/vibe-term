/**
 * Setup command implementation for vibe-term.
 *
 * Handles installation of Claude Code hooks to ~/.claude/settings.json with:
 * - Backup creation before modifying settings
 * - Idempotency (safe to run multiple times)
 * - Colored output with file paths
 * - Confirmation prompt (skippable with --yes)
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  success,
  error,
  warning,
  info,
  filePath,
  cyan,
  heading,
} from './output.js';
import {
  readClaudeSettings,
  writeClaudeSettings,
  settingsFileExists,
  getSettingsPath,
} from '../services/settingsService.js';
import {
  installHookScript,
  getVibeTermPath,
} from '../services/vibeTermDirService.js';
import { isVibeTermInstalled, mergeHooks } from '../services/hookMerger.js';

/**
 * Exit codes for the setup command.
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  USER_ABORT: 2,
} as const;

/**
 * Options for the setup command.
 */
interface SetupOptions {
  /** Skip confirmation prompt */
  yes: boolean;
  /** Show detailed output */
  verbose: boolean;
}

/**
 * Prompt the user for confirmation.
 *
 * @param message - The message to display
 * @returns true if user confirms, false otherwise
 */
async function confirm(message: string): Promise<boolean> {
  // Skip prompt in CI or piped input
  if (!stdin.isTTY) {
    return true;
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`${message} [Y/n] `);
    // Empty answer (Enter) or "y"/"yes" means confirm
    return answer === '' || /^y(es)?$/i.test(answer);
  } finally {
    rl.close();
  }
}

/**
 * Run the setup command to install vibe-term hooks.
 *
 * @param options - Setup options
 * @returns Exit code
 */
export async function runSetup(options: SetupOptions): Promise<number> {
  const { yes, verbose } = options;

  // Step 1: Check settings.json exists
  const exists = await settingsFileExists();
  if (!exists) {
    error('Settings file not found. Run Claude Code first to create it.');
    info(`Expected path: ${filePath(getSettingsPath())}`);
    return EXIT_CODES.ERROR;
  }

  // Step 2: Read current settings
  let settings;
  try {
    settings = await readClaudeSettings();
  } catch (err) {
    error(`Failed to read settings: ${(err as Error).message}`);
    return EXIT_CODES.ERROR;
  }

  // Step 3: Check if already installed
  if (isVibeTermInstalled(settings)) {
    success('Hooks already installed');
    return EXIT_CODES.SUCCESS;
  }

  // Step 4: Show preview in verbose mode
  if (verbose) {
    console.log(heading('\nChanges to be made:'));
    console.log(`  ${cyan('Create:')} ${filePath(getVibeTermPath('status-hook.sh'))}`);
    console.log(`  ${cyan('Modify:')} ${filePath(getSettingsPath())}`);
    console.log('');
  }

  // Step 5: Confirm (unless --yes)
  if (!yes) {
    const proceed = await confirm('This will modify ~/.claude/settings.json. Continue?');
    if (!proceed) {
      warning('Setup cancelled');
      return EXIT_CODES.USER_ABORT;
    }
  }

  // Step 6: Install hook script
  let hookScriptPath;
  try {
    hookScriptPath = await installHookScript();
    success(`Created ${filePath(hookScriptPath)}`);
  } catch (err) {
    error(`Failed to install hook script: ${(err as Error).message}`);
    return EXIT_CODES.ERROR;
  }

  // Step 7: Merge hooks and write settings
  const merged = mergeHooks(settings);
  let backupPath;
  try {
    backupPath = await writeClaudeSettings(merged, { backup: true });
    if (backupPath) {
      info(`Backup created at ${filePath(backupPath)}`);
    }
    success(`Modified ${filePath(getSettingsPath())}`);
  } catch (err) {
    error('Cannot create backup. Aborting to protect existing settings.');
    error(`Details: ${(err as Error).message}`);
    return EXIT_CODES.ERROR;
  }

  // Step 8: Success message
  console.log('');
  success('vibe-term hooks installed successfully!');
  info('Next step: Run `vibe-term audit` to verify installation');

  return EXIT_CODES.SUCCESS;
}

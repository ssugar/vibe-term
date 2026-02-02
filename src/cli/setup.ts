/**
 * Setup command implementation for vibe-term.
 *
 * Handles installation of Claude Code hooks to ~/.claude/settings.json with:
 * - Backup creation before modifying settings
 * - Idempotency (safe to run multiple times)
 * - Colored output with file paths
 * - Confirmation prompt (skippable with --yes)
 * - JSON output mode for machine-readable results
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
  setJsonMode,
  isJsonMode,
  getCollectedErrors,
  collectError,
} from './output.js';
import { createJsonOutput, outputJson } from './json.js';
import { getSetupSuggestion, type SetupResult } from './suggestions.js';
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
  /** Output machine-readable JSON */
  json: boolean;
}

/**
 * Prompt the user for confirmation.
 *
 * @param message - The message to display
 * @param options - Setup options (for JSON mode check)
 * @returns true if user confirms, false otherwise
 */
async function confirm(message: string, options: SetupOptions): Promise<boolean> {
  // JSON mode without --yes is an error (non-interactive)
  if (options.json && !options.yes) {
    collectError('Confirmation required but --json mode is non-interactive. Use --yes to skip confirmation.', 'CONFIRMATION');
    return false;
  }

  // JSON mode with --yes auto-confirms
  if (options.json && options.yes) {
    return true;
  }

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
 * Output JSON result and return exit code.
 */
function outputJsonResult(
  result: SetupResult,
  exitCode: number,
  startTime: bigint
): number {
  const suggestion = getSetupSuggestion(result);
  const suggestions = suggestion ? [suggestion] : [];
  const output = createJsonOutput('setup', result, {
    success: result.installed || result.already_installed,
    errors: getCollectedErrors(),
    suggestions,
    startTime,
  });
  outputJson(output);
  return exitCode;
}

/**
 * Run the setup command to install vibe-term hooks.
 *
 * @param options - Setup options
 * @returns Exit code
 */
export async function runSetup(options: SetupOptions): Promise<number> {
  const { yes, verbose, json } = options;
  const startTime = process.hrtime.bigint();
  setJsonMode(json);

  // Initialize result tracking
  const result: SetupResult = {
    installed: false,
    already_installed: false,
  };

  // Step 1: Check settings.json exists
  const exists = await settingsFileExists();
  if (!exists) {
    error('Settings file not found. Run Claude Code first to create it.');
    if (!isJsonMode()) {
      info(`Expected path: ${filePath(getSettingsPath())}`);
    }
    if (isJsonMode()) {
      return outputJsonResult(result, EXIT_CODES.ERROR, startTime);
    }
    return EXIT_CODES.ERROR;
  }

  // Step 2: Read current settings
  let settings;
  try {
    settings = await readClaudeSettings();
  } catch (err) {
    error(`Failed to read settings: ${(err as Error).message}`);
    if (isJsonMode()) {
      return outputJsonResult(result, EXIT_CODES.ERROR, startTime);
    }
    return EXIT_CODES.ERROR;
  }

  // Step 3: Check if already installed
  if (isVibeTermInstalled(settings)) {
    result.already_installed = true;
    if (isJsonMode()) {
      return outputJsonResult(result, EXIT_CODES.SUCCESS, startTime);
    }
    success('Hooks already installed');
    return EXIT_CODES.SUCCESS;
  }

  // Step 4: Show preview in verbose mode (human mode only)
  if (verbose && !isJsonMode()) {
    console.log(heading('\nChanges to be made:'));
    console.log(`  ${cyan('Create:')} ${filePath(getVibeTermPath('status-hook.sh'))}`);
    console.log(`  ${cyan('Modify:')} ${filePath(getSettingsPath())}`);
    console.log('');
  }

  // Step 5: Confirm (unless --yes)
  if (!yes) {
    const proceed = await confirm('This will modify ~/.claude/settings.json. Continue?', options);
    if (!proceed) {
      if (isJsonMode()) {
        // Error was already collected in confirm()
        return outputJsonResult(result, EXIT_CODES.USER_ABORT, startTime);
      }
      warning('Setup cancelled');
      return EXIT_CODES.USER_ABORT;
    }
  }

  // Step 6: Install hook script
  let hookScriptPath: string;
  try {
    hookScriptPath = await installHookScript();
    result.hook_script_path = hookScriptPath;
    if (!isJsonMode()) {
      success(`Created ${filePath(hookScriptPath)}`);
    }
  } catch (err) {
    error(`Failed to install hook script: ${(err as Error).message}`);
    if (isJsonMode()) {
      return outputJsonResult(result, EXIT_CODES.ERROR, startTime);
    }
    return EXIT_CODES.ERROR;
  }

  // Step 7: Merge hooks and write settings
  const merged = mergeHooks(settings);
  let backupPath: string | null | undefined;
  try {
    backupPath = await writeClaudeSettings(merged, { backup: true });
    result.settings_path = getSettingsPath();
    if (backupPath !== null && backupPath !== undefined) {
      result.backup_path = backupPath;
      if (!isJsonMode()) {
        info(`Backup created at ${filePath(backupPath)}`);
      }
    }
    if (!isJsonMode()) {
      success(`Modified ${filePath(getSettingsPath())}`);
    }
  } catch (err) {
    error('Cannot create backup. Aborting to protect existing settings.');
    if (!isJsonMode()) {
      error(`Details: ${(err as Error).message}`);
    } else {
      collectError(`Details: ${(err as Error).message}`, 'BACKUP');
    }
    if (isJsonMode()) {
      return outputJsonResult(result, EXIT_CODES.ERROR, startTime);
    }
    return EXIT_CODES.ERROR;
  }

  // Step 8: Mark as installed
  result.installed = true;

  // Step 9: Output results
  if (isJsonMode()) {
    return outputJsonResult(result, EXIT_CODES.SUCCESS, startTime);
  }

  // Human mode success message with suggestion
  console.log('');
  success('vibe-term hooks installed successfully!');
  const suggestion = getSetupSuggestion(result);
  if (suggestion) {
    console.log(`${cyan('->')} ${suggestion.action}`);
  }

  return EXIT_CODES.SUCCESS;
}

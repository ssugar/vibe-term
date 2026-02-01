import { readFile, writeFile, copyFile, access, constants } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const CLAUDE_DIR = join(homedir(), '.claude');
const CLAUDE_SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json');

export interface ClaudeSettings {
  env?: Record<string, string>;
  attribution?: Record<string, string>;
  hooks?: Record<string, HookConfig[]>;
  [key: string]: unknown;
}

export interface HookConfig {
  matcher?: string;
  hooks: Array<{
    type: string;
    command: string;
  }>;
}

/**
 * Format a date as YYYY-MM-DD_HHmmss (human readable, filesystem safe)
 * Example: 2026-01-30_143052
 */
export function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
}

/**
 * Read Claude settings.json from ~/.claude/settings.json
 * Returns empty object {} if file doesn't exist
 * Throws descriptive error if JSON is invalid
 */
export async function readClaudeSettings(): Promise<ClaudeSettings> {
  try {
    const content = await readFile(CLAUDE_SETTINGS_PATH, 'utf-8');
    try {
      return JSON.parse(content) as ClaudeSettings;
    } catch (parseError) {
      throw new Error(`Invalid JSON in settings.json: ${(parseError as Error).message}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

/**
 * Write settings to ~/.claude/settings.json with pretty-printed JSON
 * Creates a backup before writing by default
 * Returns the backup path if a backup was created, null otherwise
 */
export async function writeClaudeSettings(
  settings: ClaudeSettings,
  options: { backup?: boolean } = {}
): Promise<string | null> {
  const { backup = true } = options;
  let backupPath: string | null = null;

  // Create backup if requested and file exists
  if (backup && await settingsFileExists()) {
    backupPath = await backupSettings();
  }

  // Write settings with pretty printing
  const content = JSON.stringify(settings, null, 2);
  await writeFile(CLAUDE_SETTINGS_PATH, content, 'utf-8');

  return backupPath;
}

/**
 * Create a backup of the current settings.json
 * Backup filename format: settings.json.vibe-term-backup.YYYY-MM-DD_HHmmss
 * Returns the backup file path
 */
export async function backupSettings(): Promise<string> {
  const timestamp = formatTimestamp(new Date());
  const backupPath = `${CLAUDE_SETTINGS_PATH}.vibe-term-backup.${timestamp}`;
  await copyFile(CLAUDE_SETTINGS_PATH, backupPath);
  return backupPath;
}

/**
 * Check if settings.json exists
 */
export async function settingsFileExists(): Promise<boolean> {
  try {
    await access(CLAUDE_SETTINGS_PATH, constants.F_OK);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Get the path to the Claude settings.json file
 */
export function getSettingsPath(): string {
  return CLAUDE_SETTINGS_PATH;
}

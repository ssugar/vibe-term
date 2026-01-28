import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * User configuration for vibe-term
 */
export interface Config {
  hudPosition: 'top' | 'bottom';
  hudHeight: number; // Lines for HUD pane (3-15 reasonable range)
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Config = {
  hudPosition: 'top',
  hudHeight: 3, // Compact strip: 1 line tabs + 1 line help/error + 1 buffer
};

/**
 * Path to user configuration file
 */
const CONFIG_PATH = join(homedir(), '.config', 'vibe-term', 'config.json');

/**
 * Validate that hudPosition is a valid value
 */
function isValidHudPosition(value: unknown): value is 'top' | 'bottom' {
  return value === 'top' || value === 'bottom';
}

/**
 * Validate that hudHeight is a valid value (3-15 lines)
 */
function isValidHudHeight(value: unknown): value is number {
  return typeof value === 'number' && value >= 3 && value <= 15;
}

/**
 * Load user configuration from ~/.config/vibe-term/config.json
 * Returns DEFAULT_CONFIG when file is missing or invalid.
 *
 * Behavior:
 * - If config file doesn't exist, returns defaults
 * - If config file has invalid JSON, logs warning and returns defaults
 * - If config file has partial config, merges with defaults
 * - Validates values and falls back to defaults for invalid values
 *
 * Does NOT create the config file automatically - users create it manually
 * if they want non-default settings.
 */
export function loadConfig(): Config {
  // Check if config file exists
  if (!existsSync(CONFIG_PATH)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(content) as Record<string, unknown>;

    // Merge with defaults to handle partial configs
    const merged = { ...DEFAULT_CONFIG };

    // Validate and apply hudPosition
    if (isValidHudPosition(parsed.hudPosition)) {
      merged.hudPosition = parsed.hudPosition;
    } else if (parsed.hudPosition !== undefined) {
      // Invalid value - log warning
      console.error(
        `Warning: Invalid hudPosition "${parsed.hudPosition}" in config. Using default "${DEFAULT_CONFIG.hudPosition}".`
      );
    }

    // Validate and apply hudHeight
    if (isValidHudHeight(parsed.hudHeight)) {
      merged.hudHeight = parsed.hudHeight;
    } else if (parsed.hudHeight !== undefined) {
      // Invalid value - log warning
      console.error(
        `Warning: Invalid hudHeight "${parsed.hudHeight}" in config. Using default "${DEFAULT_CONFIG.hudHeight}".`
      );
    }

    return merged;
  } catch (error) {
    // Parse error or read error - log warning and return defaults
    console.error(
      `Warning: Failed to parse config at ${CONFIG_PATH}. Using defaults.`
    );
    return DEFAULT_CONFIG;
  }
}

/**
 * JSON output types and formatters for CLI commands.
 * Provides consistent JSON envelope format for machine-readable output.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// Type definitions
// ============================================================================

/**
 * JSON error structure with category and message.
 */
export interface JsonError {
  category: string;
  message: string;
}

/**
 * JSON suggestion structure for contextual next actions.
 */
export interface JsonSuggestion {
  action: string;
  command: string;
  reason: string;
}

/**
 * JSON output envelope structure.
 * All commands produce this same structure when --json is used.
 */
export interface JsonOutput<T = unknown> {
  success: boolean;
  data: T;
  errors: JsonError[];
  suggestions: JsonSuggestion[];
  meta: {
    timestamp: string;
    version: string;
    duration_ms: number;
    command: string;
  };
}

// ============================================================================
// Version helper (cached at module load)
// ============================================================================

let cachedVersion: string | undefined;

/**
 * Get the vibe-term version from package.json.
 * Result is cached on first call.
 */
export function getVersion(): string {
  if (cachedVersion !== undefined) {
    return cachedVersion;
  }

  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    // Navigate from src/cli/ to project root
    const packagePath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    cachedVersion = (packageJson.version as string) || '0.0.0';
  } catch {
    cachedVersion = '0.0.0';
  }

  return cachedVersion;
}

// ============================================================================
// Factory and output functions
// ============================================================================

/**
 * Create a JSON output envelope.
 */
export function createJsonOutput<T>(
  command: string,
  data: T,
  options: {
    success: boolean;
    errors?: JsonError[];
    suggestions?: JsonSuggestion[];
    startTime: bigint;
  }
): JsonOutput<T> {
  const duration_ms = Number(process.hrtime.bigint() - options.startTime) / 1_000_000;

  return {
    success: options.success,
    data,
    errors: options.errors || [],
    suggestions: options.suggestions || [],
    meta: {
      timestamp: new Date().toISOString(),
      version: getVersion(),
      duration_ms: Math.round(duration_ms * 100) / 100,
      command,
    },
  };
}

/**
 * Output JSON to stdout with pretty formatting.
 */
export function outputJson<T>(output: JsonOutput<T>): void {
  console.log(JSON.stringify(output, null, 2));
}

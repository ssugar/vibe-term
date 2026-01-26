import { existsSync, readdirSync, mkdirSync, statSync } from 'fs';
import { dirname, basename, join, resolve } from 'path';

/**
 * Directory Service
 *
 * Provides directory completion and validation for spawn mode.
 * Handles path expansion, existence checks, and directory creation.
 */

/**
 * Expand tilde (~) to home directory.
 *
 * @param path - Path that may start with ~
 * @returns Path with ~ expanded to HOME environment variable
 */
export function expandTilde(path: string): string {
  if (path.startsWith('~')) {
    const home = process.env.HOME || '~';
    return path.replace('~', home);
  }
  return path;
}

/**
 * Check if a path exists and is a directory.
 *
 * @param path - Path to check (tilde will be expanded)
 * @returns True if path exists and is a directory
 */
export function directoryExists(path: string): boolean {
  try {
    const expanded = expandTilde(path);
    const stat = statSync(expanded);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Create a directory, including parent directories (mkdir -p).
 *
 * @param path - Path to create (tilde will be expanded)
 * @throws Error if directory cannot be created
 */
export function createDirectory(path: string): void {
  const expanded = expandTilde(path);
  mkdirSync(expanded, { recursive: true });
}

/**
 * Get directory completions for a partial path.
 *
 * @param partial - Partial path to complete
 * @returns Array of matching directory paths, or empty array on error
 *
 * Examples:
 *   getDirectoryCompletions('/ho') -> ['/home']
 *   getDirectoryCompletions('~/Doc') -> ['/home/user/Documents', '/home/user/Docker']
 *   getDirectoryCompletions('/home/user/') -> all directories in /home/user/
 */
export function getDirectoryCompletions(partial: string): string[] {
  // Handle empty input
  if (!partial || partial.trim() === '') {
    return [];
  }

  try {
    // Expand tilde first
    const expanded = expandTilde(partial);

    // Determine search directory and prefix
    let searchDir: string;
    let prefix: string;

    // Check if partial ends with / (user wants contents of that directory)
    if (expanded.endsWith('/')) {
      searchDir = expanded;
      prefix = '';
    } else {
      // Otherwise, search parent directory for entries matching basename
      searchDir = dirname(expanded);
      prefix = basename(expanded);
    }

    // Resolve to absolute path
    searchDir = resolve(searchDir);

    // Check if search directory exists
    if (!existsSync(searchDir)) {
      return [];
    }

    // Read directory entries
    const entries = readdirSync(searchDir, { withFileTypes: true });

    // Filter for directories that start with prefix
    const matches = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
      .map((entry) => join(searchDir, entry.name));

    // Sort alphabetically
    return matches.sort();
  } catch {
    // Any error (permissions, invalid path, etc.) - return empty array
    return [];
  }
}

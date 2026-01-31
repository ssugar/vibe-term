/**
 * CLI output utilities for colored status messages and formatting.
 * Uses picocolors for terminal colors and figures for cross-platform symbols.
 */

import pc from 'picocolors';
import figures from 'figures';

// ============================================================================
// Status message functions - print colored messages with symbols
// ============================================================================

/**
 * Print a success message with green checkmark
 */
export function success(message: string): void {
  console.log(`${pc.green(figures.tick)} ${message}`);
}

/**
 * Print an error message with red X
 */
export function error(message: string): void {
  console.log(`${pc.red(figures.cross)} ${message}`);
}

/**
 * Print a warning message with yellow warning symbol
 */
export function warning(message: string): void {
  console.log(`${pc.yellow(figures.warning)} ${message}`);
}

/**
 * Print an info message with blue info symbol
 */
export function info(message: string): void {
  console.log(`${pc.cyan(figures.info)} ${message}`);
}

// ============================================================================
// Color helper functions - return colored strings for composition
// ============================================================================

/**
 * Return green colored text
 */
export function green(text: string): string {
  return pc.green(text);
}

/**
 * Return red colored text
 */
export function red(text: string): string {
  return pc.red(text);
}

/**
 * Return yellow colored text
 */
export function yellow(text: string): string {
  return pc.yellow(text);
}

/**
 * Return cyan colored text
 */
export function cyan(text: string): string {
  return pc.cyan(text);
}

/**
 * Return dimmed text
 */
export function dim(text: string): string {
  return pc.dim(text);
}

/**
 * Return bold text
 */
export function bold(text: string): string {
  return pc.bold(text);
}

// ============================================================================
// Semantic helpers - formatted output for common patterns
// ============================================================================

/**
 * Format a file path in cyan
 */
export function filePath(path: string): string {
  return pc.cyan(path);
}

/**
 * Format a timestamp in dim
 */
export function timestamp(time: string): string {
  return pc.dim(time);
}

/**
 * Format a key-value pair for display
 */
export function keyValue(key: string, value: string): string {
  return `${pc.dim(key + ':')} ${value}`;
}

/**
 * Format a heading in bold
 */
export function heading(text: string): string {
  return pc.bold(text);
}

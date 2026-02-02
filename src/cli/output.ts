/**
 * CLI output utilities for colored status messages and formatting.
 * Uses picocolors for terminal colors and figures for cross-platform symbols.
 * Supports dual-mode output: human-readable or JSON collection.
 */

import pc from 'picocolors';
import figures from 'figures';
import type { JsonError, JsonSuggestion } from './json.js';

// ============================================================================
// JSON mode state - module-level for dual-mode output
// ============================================================================

let jsonMode = false;
let collectedErrors: JsonError[] = [];
let collectedSuggestions: JsonSuggestion[] = [];

/**
 * Enable or disable JSON mode. When enabled, output functions collect
 * data instead of printing to console.
 */
export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
  collectedErrors = [];
  collectedSuggestions = [];
}

/**
 * Check if JSON mode is currently enabled.
 */
export function isJsonMode(): boolean {
  return jsonMode;
}

/**
 * Collect an error for JSON output.
 */
export function collectError(message: string, category = 'GENERAL'): void {
  collectedErrors.push({ category, message });
}

/**
 * Collect a suggestion for JSON output.
 */
export function collectSuggestion(suggestion: JsonSuggestion): void {
  collectedSuggestions.push(suggestion);
}

/**
 * Get all collected errors (for JSON output generation).
 */
export function getCollectedErrors(): JsonError[] {
  return collectedErrors;
}

/**
 * Get all collected suggestions (for JSON output generation).
 */
export function getCollectedSuggestions(): JsonSuggestion[] {
  return collectedSuggestions;
}

// ============================================================================
// Status message functions - print colored messages with symbols
// In JSON mode, these functions either suppress output or collect errors
// ============================================================================

/**
 * Print a success message with green checkmark.
 * In JSON mode, success is part of the data structure, not printed.
 */
export function success(message: string): void {
  if (jsonMode) return;
  console.log(`${pc.green(figures.tick)} ${message}`);
}

/**
 * Print an error message with red X.
 * In JSON mode, errors are collected for the output envelope.
 */
export function error(message: string): void {
  if (jsonMode) {
    collectError(message);
    return;
  }
  console.log(`${pc.red(figures.cross)} ${message}`);
}

/**
 * Print a warning message with yellow warning symbol.
 * In JSON mode, warnings are suppressed (can be added to data if needed).
 */
export function warning(message: string): void {
  if (jsonMode) return;
  console.log(`${pc.yellow(figures.warning)} ${message}`);
}

/**
 * Print an info message with blue info symbol.
 * In JSON mode, info messages are suppressed.
 */
export function info(message: string): void {
  if (jsonMode) return;
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

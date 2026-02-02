/**
 * Contextual suggestion logic for CLI commands.
 * Provides appropriate next-step suggestions based on command results.
 */

import type { JsonSuggestion } from './json.js';

// ============================================================================
// Result type interfaces (used by commands and suggestion functions)
// ============================================================================

/**
 * Result data from the setup command.
 */
export interface SetupResult {
  installed: boolean;
  already_installed: boolean;
  hook_script_path?: string;
  settings_path?: string;
  backup_path?: string;
}

/**
 * Result data from the audit command.
 */
export interface AuditResult {
  scanned: number;
  pass: number;
  warn: number;
  fail: number;
  projects: Array<{
    path: string;
    status: 'pass' | 'warn' | 'fail';
    issues: string[];
  }>;
}

/**
 * Result data from the fix command.
 */
export interface FixResult {
  total: number;
  fixed: number;
  skipped: number;
  failed: number;
  projects: Array<{
    path: string;
    status: 'fixed' | 'skipped' | 'failed';
    backup_path?: string;
    error?: string;
  }>;
}

// ============================================================================
// Suggestion functions
// ============================================================================

/**
 * Get suggestion after setup command completes.
 */
export function getSetupSuggestion(result: SetupResult): JsonSuggestion | null {
  if (result.installed) {
    return {
      action: 'Run `vibe-term audit` to verify hook installation across projects',
      command: 'vibe-term audit',
      reason: 'Setup completed successfully',
    };
  }
  return null;
}

/**
 * Get suggestion after audit command completes.
 */
export function getAuditSuggestion(result: AuditResult): JsonSuggestion | null {
  if (result.warn > 0 || result.fail > 0) {
    return {
      action: 'Run `vibe-term fix` to resolve hook issues',
      command: 'vibe-term fix',
      reason: `Found ${result.warn} warnings and ${result.fail} failures`,
    };
  }
  return null;
}

/**
 * Get suggestion after fix command completes.
 */
export function getFixSuggestion(result: FixResult, dryRun: boolean): JsonSuggestion | null {
  // Only suggest --apply if there are actually projects to fix
  if (dryRun && result.total > 0) {
    return {
      action: 'Run `vibe-term fix --apply` to execute changes',
      command: 'vibe-term fix --apply',
      reason: 'Dry run completed, changes not applied',
    };
  }
  if (result.fixed > 0) {
    return {
      action: 'Run `vibe-term audit` to verify fixes',
      command: 'vibe-term audit',
      reason: `Fixed ${result.fixed} projects`,
    };
  }
  return null;
}

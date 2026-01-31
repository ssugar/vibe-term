import { readFile } from 'node:fs/promises';
import type { ClaudeSettings } from './settingsService.js';

export type ConflictStatus = 'pass' | 'warn' | 'fail';

export interface ProjectAuditResult {
  path: string;           // originalPath
  status: ConflictStatus;
  issues: string[];       // List of specific issues found
}

/**
 * Classify a project based on its hook configuration
 *
 * Classification logic:
 * - PASS: No settings files exist, or no hooks section in settings
 * - WARN: Project has hooks that can be auto-merged
 * - FAIL: Malformed JSON (parse error) or invalid structure
 */
export async function classifyProject(
  projectPath: string,
  settingsPath: string | null,
  localSettingsPath: string | null
): Promise<ProjectAuditResult> {
  const issues: string[] = [];

  // If no settings files exist, it's a clean pass
  if (settingsPath === null && localSettingsPath === null) {
    return { path: projectPath, status: 'pass', issues: [] };
  }

  // Check shared settings
  if (settingsPath !== null) {
    try {
      const content = await readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content) as ClaudeSettings;
      if (settings.hooks && Object.keys(settings.hooks).length > 0) {
        issues.push('Project has shared hooks (.claude/settings.json)');
      }
    } catch (error) {
      // Check if it's a JSON parse error
      if (error instanceof SyntaxError) {
        return {
          path: projectPath,
          status: 'fail',
          issues: ['Malformed .claude/settings.json']
        };
      }
      // Other errors (like file not found during read) - skip
    }
  }

  // Check local settings
  if (localSettingsPath !== null) {
    try {
      const content = await readFile(localSettingsPath, 'utf-8');
      const settings = JSON.parse(content) as ClaudeSettings;
      if (settings.hooks && Object.keys(settings.hooks).length > 0) {
        issues.push('Project has local hooks (.claude/settings.local.json)');
      }
    } catch (error) {
      // Check if it's a JSON parse error
      if (error instanceof SyntaxError) {
        return {
          path: projectPath,
          status: 'fail',
          issues: ['Malformed .claude/settings.local.json']
        };
      }
      // Other errors - skip
    }
  }

  // Classify: no hooks = pass, has hooks = warn (can be auto-merged)
  if (issues.length === 0) {
    return { path: projectPath, status: 'pass', issues: [] };
  }
  return { path: projectPath, status: 'warn', issues };
}

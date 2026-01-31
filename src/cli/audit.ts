/**
 * Audit command implementation for vibe-term.
 *
 * Scans ~/.claude/projects/ to discover Claude projects and detect hook conflicts
 * with vibe-term's global hooks. Displays pass/warn/fail status per project with
 * colored table output, supports filtering and verbose mode.
 */

import figures from 'figures';
import {
  success,
  error,
  warning,
  info,
  dim,
  green,
  yellow,
  red,
} from './output.js';
import {
  readClaudeSettings,
  settingsFileExists,
} from '../services/settingsService.js';
import { isVibeTermInstalled } from '../services/hookMerger.js';
import {
  discoverProjects,
  filterByPattern,
  type DiscoveredProject,
} from '../services/projectScanner.js';
import {
  classifyProject,
  type ProjectAuditResult,
  type ConflictStatus,
} from '../services/conflictDetector.js';

/**
 * Exit codes for the audit command.
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  CONFLICTS_FOUND: 1,
  ERROR: 2,
} as const;

/**
 * Options for the audit command.
 */
export interface AuditOptions {
  /** Show only failing projects */
  failOnly: boolean;
  /** Show detailed output */
  verbose: boolean;
  /** Glob pattern or path to filter projects */
  pattern?: string;
}

/**
 * Format a conflict status as a colored symbol.
 */
function formatStatus(status: ConflictStatus): string {
  switch (status) {
    case 'pass':
      return green(figures.tick);
    case 'warn':
      return yellow(figures.warning);
    case 'fail':
      return red(figures.cross);
  }
}

/**
 * Truncate a path to fit within maxLen, showing end with leading ellipsis.
 */
function truncatePath(path: string, maxLen: number): string {
  if (path.length <= maxLen) {
    return path;
  }
  return '...' + path.slice(-(maxLen - 3));
}

/**
 * Display the results table.
 */
function displayTable(results: ProjectAuditResult[]): void {
  // Header
  console.log(dim('PATH'.padEnd(50) + 'STATUS  ISSUES'));
  console.log(dim('-'.repeat(70)));

  for (const result of results) {
    const path = truncatePath(result.path, 48);
    const status = formatStatus(result.status);
    const issueCount = result.issues.length > 0 ? String(result.issues.length) : '-';

    console.log(`${path.padEnd(50)} ${status}      ${issueCount}`);
  }
}

/**
 * Display verbose details for projects with issues.
 */
function displayVerboseDetails(results: ProjectAuditResult[]): void {
  const withIssues = results.filter(r => r.issues.length > 0);
  if (withIssues.length === 0) {
    return;
  }

  console.log('');
  console.log(dim('Detailed breakdown:'));
  console.log('');

  for (const result of withIssues) {
    const status = formatStatus(result.status);
    console.log(`${status} ${result.path}`);
    for (const issue of result.issues) {
      console.log(`  ${dim('-')} ${issue}`);
    }
    console.log('');
  }
}

/**
 * Display the summary line.
 */
function displaySummary(results: ProjectAuditResult[]): void {
  const passCount = results.filter(r => r.status === 'pass').length;
  const warnCount = results.filter(r => r.status === 'warn').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  console.log('');
  console.log(
    `Scanned ${results.length} projects: ${green(passCount + ' pass')}, ${yellow(warnCount + ' warn')}, ${red(failCount + ' fail')}`
  );
}

/**
 * Run the audit command to scan for hook conflicts.
 *
 * @param options - Audit options
 * @returns Exit code
 */
export async function runAudit(options: AuditOptions): Promise<number> {
  const { failOnly, verbose, pattern } = options;

  // Step 1: Verify global hooks are installed
  const settingsExist = await settingsFileExists();
  if (!settingsExist) {
    error('Global settings not found. Run `vibe-term setup` first.');
    return EXIT_CODES.ERROR;
  }

  const settings = await readClaudeSettings();
  if (!isVibeTermInstalled(settings)) {
    error('vibe-term hooks not installed. Run `vibe-term setup` first.');
    return EXIT_CODES.ERROR;
  }

  // Step 2: Discover projects
  let projects: DiscoveredProject[];
  try {
    projects = await discoverProjects();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      warning('No projects found. ~/.claude/projects/ does not exist.');
      return EXIT_CODES.SUCCESS;
    }
    throw err;
  }

  if (projects.length === 0) {
    info('No projects found to audit.');
    return EXIT_CODES.SUCCESS;
  }

  // Step 3: Filter by pattern if provided
  if (pattern) {
    projects = filterByPattern(projects, pattern);
    if (projects.length === 0) {
      warning(`No projects match pattern: ${pattern}`);
      return EXIT_CODES.SUCCESS;
    }
  }

  // Step 4: Classify each project
  const results: ProjectAuditResult[] = [];
  for (const project of projects) {
    const result = await classifyProject(
      project.originalPath,
      project.settingsPath,
      project.localSettingsPath
    );
    results.push(result);
  }

  // Step 5: Filter results if --fail-only
  const displayResults = failOnly
    ? results.filter(r => r.status === 'fail')
    : results;

  // Step 6: Display table
  displayTable(displayResults);

  // Step 7: Show verbose details if requested
  if (verbose) {
    displayVerboseDetails(results);
  }

  // Step 8: Summary
  displaySummary(results);

  // Step 9: Return exit code
  const hasFailures = results.some(r => r.status === 'fail');
  return hasFailures ? EXIT_CODES.CONFLICTS_FOUND : EXIT_CODES.SUCCESS;
}

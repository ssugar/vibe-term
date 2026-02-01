/**
 * Fix command implementation for vibe-term.
 *
 * Previews and applies hook fixes to project settings. Supports dry-run mode
 * (default), per-project confirmation prompts, and batch mode with --yes flag.
 * Creates backups before modifying any files.
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import figures from 'figures';
import {
  success,
  error,
  warning,
  info,
  dim,
  cyan,
  heading,
  filePath,
} from './output.js';
import {
  readClaudeSettings,
  settingsFileExists,
} from '../services/settingsService.js';
import { isVibeTermInstalled } from '../services/hookMerger.js';
import {
  discoverProjects,
  filterByPattern,
} from '../services/projectScanner.js';
import { classifyProject } from '../services/conflictDetector.js';
import {
  generateFixPreview,
  applyFix,
  type FixPreview,
  type FixResult,
} from '../services/projectFixer.js';

/**
 * Exit codes for the fix command.
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  PARTIAL_FAILURE: 1, // Some projects failed
  ERROR: 2, // Command couldn't run
} as const;

/**
 * Options for the fix command.
 */
export interface FixOptions {
  /** Execute changes (vs dry-run) */
  apply: boolean;
  /** Skip confirmation prompts */
  yes: boolean;
  /** Show detailed output */
  verbose: boolean;
  /** Glob pattern or path to filter projects */
  pattern?: string;
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
 * Display a summary table of projects to be fixed.
 */
function displaySummaryTable(previews: FixPreview[]): void {
  console.log('');
  console.log(heading('Projects to fix:'));
  console.log('');

  // Table header
  console.log(dim('PATH'.padEnd(50) + 'MODE'));
  console.log(dim('-'.repeat(65)));

  // Filter out already configured
  const toFix = previews.filter((p) => !p.alreadyConfigured);

  for (const preview of toFix) {
    const path = truncatePath(preview.projectPath, 48);
    console.log(`${path.padEnd(50)} ${preview.mode}`);
  }

  console.log('');
  console.log(dim(`${toFix.length} project(s) will be modified`));
}

/**
 * Display before/after hooks for a project.
 */
function displayBeforeAfter(preview: FixPreview): void {
  console.log('');
  console.log(heading(preview.projectPath));
  console.log(dim(`  Settings: ${preview.settingsPath}`));
  console.log(dim(`  Mode: ${preview.mode}`));
  console.log('');

  // BEFORE section
  console.log(dim('  BEFORE:'));
  if (
    preview.beforeHooks === undefined ||
    Object.keys(preview.beforeHooks).length === 0
  ) {
    console.log(dim('    (no hooks)'));
  } else {
    const beforeJson = JSON.stringify(preview.beforeHooks, null, 2);
    for (const line of beforeJson.split('\n')) {
      console.log(dim(`    ${line}`));
    }
  }
  console.log('');

  // AFTER section
  console.log(cyan('  AFTER:'));
  if (preview.afterHooks === undefined) {
    console.log(cyan('    (hooks section removed - inherits global)'));
  } else {
    const afterJson = JSON.stringify(preview.afterHooks, null, 2);
    for (const line of afterJson.split('\n')) {
      console.log(cyan(`    ${line}`));
    }
  }
}

/**
 * Prompt user to confirm fixing a specific project.
 * Returns true if confirmed, false if declined.
 */
async function confirmProject(
  projectPath: string,
  preview: FixPreview
): Promise<boolean> {
  // Auto-proceed in CI/non-TTY environments
  if (!stdin.isTTY) {
    return true;
  }

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    console.log('');
    console.log(`${figures.pointer} ${filePath(projectPath)}`);
    console.log(
      dim(
        `  Mode: ${preview.mode === 'merge' ? 'Add vibe-term hooks to existing' : 'Remove hooks (use global only)'}`
      )
    );

    const answer = await rl.question('  Apply fix? [y/N] ');
    const normalized = answer.toLowerCase().trim();
    return normalized === 'y' || normalized === 'yes';
  } finally {
    rl.close();
  }
}

/**
 * Run the fix command to preview/apply hook fixes.
 *
 * @param options - Fix options
 * @returns Exit code
 */
export async function runFix(options: FixOptions): Promise<number> {
  const { apply, yes, verbose, pattern } = options;

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
  let projects;
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
    info('No projects found.');
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

  // Step 4: Find projects needing fixes (status === 'warn' with settingsPath)
  const projectsNeedingFix: Array<{
    originalPath: string;
    settingsPath: string;
  }> = [];

  for (const project of projects) {
    const result = await classifyProject(
      project.originalPath,
      project.settingsPath,
      project.localSettingsPath
    );

    // Only fix projects with 'warn' status (have hooks that can be merged)
    // and have a settingsPath (we can modify the file)
    if (result.status === 'warn' && project.settingsPath !== null) {
      projectsNeedingFix.push({
        originalPath: project.originalPath,
        settingsPath: project.settingsPath,
      });
    }
  }

  if (projectsNeedingFix.length === 0) {
    info('No projects need fixing.');
    return EXIT_CODES.SUCCESS;
  }

  // Step 5: Generate previews
  const previews: FixPreview[] = [];
  for (const project of projectsNeedingFix) {
    const preview = await generateFixPreview(
      project.originalPath,
      project.settingsPath,
      'merge' // Default mode per CONTEXT.md
    );
    previews.push(preview);
  }

  // Filter out already configured projects
  const toFix = previews.filter((p) => !p.alreadyConfigured);
  if (toFix.length === 0) {
    info('All projects already have vibe-term hooks configured.');
    return EXIT_CODES.SUCCESS;
  }

  // Step 6: Display summary and previews
  displaySummaryTable(toFix);

  // Show before/after in dry-run or verbose mode
  if (!apply || verbose) {
    for (const preview of toFix) {
      displayBeforeAfter(preview);
    }
  }

  // Step 7: Dry-run exit
  if (!apply) {
    console.log('');
    info('Dry run complete. Use --apply to execute changes.');
    return EXIT_CODES.SUCCESS;
  }

  // Step 8: Apply fixes with confirmation
  const results: FixResult[] = [];

  for (const preview of toFix) {
    // Prompt for confirmation unless --yes
    if (!yes) {
      const confirmed = await confirmProject(preview.projectPath, preview);
      if (!confirmed) {
        info(`Skipped: ${preview.projectPath}`);
        continue;
      }
    }

    // Apply the fix
    const result = await applyFix(
      preview.settingsPath,
      preview.projectPath,
      preview.mode
    );
    results.push(result);

    if (result.success) {
      success(`Fixed: ${preview.projectPath}`);
      if (result.backupPath) {
        info(`  Backup: ${result.backupPath}`);
      }
    } else {
      error(`Failed: ${preview.projectPath}`);
      if (result.error) {
        error(`  ${result.error}`);
      }
    }
  }

  // Step 9: Summary
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log('');
  info(`Fixed ${successCount} project(s), ${failCount} failed.`);

  // Step 10: Exit code
  if (failCount > 0) {
    return EXIT_CODES.PARTIAL_FAILURE;
  }
  return EXIT_CODES.SUCCESS;
}

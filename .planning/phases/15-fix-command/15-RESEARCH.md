# Phase 15: Fix Command - Research

**Researched:** 2026-01-31
**Domain:** CLI command implementation, JSON file manipulation, hook merging, interactive prompts
**Confidence:** HIGH

## Summary

This research establishes how to implement the `vibe-term fix` command that resolves hook conflicts detected by audit. The phase builds directly on Phase 14's audit infrastructure (projectScanner, conflictDetector) and Phase 12's foundation services (settingsService, hookMerger). The fix command reuses the project discovery and classification logic, then applies targeted modifications to resolve conflicts.

The key insight is that the fix command has two distinct operations based on CONTEXT.md decisions:
1. **Merge into project**: Copy vibe-term hooks into project settings (append to existing, preserving order)
2. **Remove project override**: Delete the hooks section to let global hooks take effect

Per CONTEXT.md, the command defaults to dry-run mode (preview changes), requires `--apply` to execute, and supports per-project confirmation prompts (skippable with `--yes`). The before/after output format (not diff) shows only the hooks section context for clarity.

**Primary recommendation:** Create `src/cli/fix.ts` following the audit.ts pattern, with new service functions in `src/services/projectFixer.ts` for generating fix previews and applying changes. Reuse existing backup logic from settingsService.ts, adding auto-restore capability if fix creates invalid JSON.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| picocolors | 1.1.x | Terminal colors | Already in project, used by output.ts |
| figures | 6.1.0 | Status symbols | Already in project, provides tick/cross/warning |
| meow | 14.x | CLI parsing | Already in project, handles flags and positional args |
| fs/promises | built-in | File operations | Native async, used for read/write/backup |
| node:readline/promises | built-in | Interactive prompts | Native async, used in setup.ts pattern |
| micromatch | 4.x | Glob pattern matching | Already in project from Phase 14 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| path | built-in | Path manipulation | Cross-platform path operations |
| os | built-in | Home directory | For ~/.claude/ resolution |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| readline/promises | inquirer | Inquirer is heavier, readline already used |
| manual JSON validation | ajv | Overkill for simple parse/serialize check |
| manual backup | write-file-atomic | Added dependency for minimal benefit |

**Installation:**
```bash
# No new dependencies required - all tools already in project
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/
│   ├── output.ts           # Existing - colors and symbols
│   ├── setup.ts            # Existing - setup command with confirm pattern
│   ├── audit.ts            # Existing - audit command
│   └── fix.ts              # NEW - fix command entry point
├── services/
│   ├── settingsService.ts  # Existing - read/write settings, backup
│   ├── hookMerger.ts       # Existing - mergeHooks, VIBE_TERM_HOOK_SCRIPT
│   ├── projectScanner.ts   # Existing - discoverProjects, filterByPattern
│   ├── conflictDetector.ts # Existing - classifyProject
│   └── projectFixer.ts     # NEW - generateFixPreview, applyFix
```

### Pattern 1: Fix Preview Generation
**What:** Generate before/after representation of hook changes without modifying files
**When to use:** Dry-run mode (default) or before applying changes
**Example:**
```typescript
// src/services/projectFixer.ts
import { readFile } from 'node:fs/promises';
import type { ClaudeSettings } from './settingsService.js';
import { mergeHooks, isVibeTermInstalled, VIBE_TERM_HOOK_SCRIPT } from './hookMerger.js';

export type FixMode = 'merge' | 'remove-override';

export interface FixPreview {
  projectPath: string;
  settingsPath: string;
  mode: FixMode;
  beforeHooks: Record<string, unknown> | undefined;
  afterHooks: Record<string, unknown> | undefined;
  alreadyConfigured: boolean;  // vibe-term hooks already present
}

export async function generateFixPreview(
  projectPath: string,
  settingsPath: string,
  mode: FixMode
): Promise<FixPreview> {
  const content = await readFile(settingsPath, 'utf-8');
  const settings = JSON.parse(content) as ClaudeSettings;

  const beforeHooks = settings.hooks;

  if (mode === 'merge') {
    // Check if already configured
    if (isVibeTermInstalled(settings)) {
      return {
        projectPath,
        settingsPath,
        mode,
        beforeHooks,
        afterHooks: beforeHooks,
        alreadyConfigured: true,
      };
    }

    // Generate merged hooks
    const merged = mergeHooks(settings);
    return {
      projectPath,
      settingsPath,
      mode,
      beforeHooks,
      afterHooks: merged.hooks,
      alreadyConfigured: false,
    };
  }

  // mode === 'remove-override'
  return {
    projectPath,
    settingsPath,
    mode,
    beforeHooks,
    afterHooks: undefined,  // Hooks section will be removed
    alreadyConfigured: false,
  };
}
```

### Pattern 2: Apply Fix with Backup and Validation
**What:** Write changes to settings file with backup and auto-restore on failure
**When to use:** When user confirms fix with --apply
**Example:**
```typescript
// src/services/projectFixer.ts (continued)
import { readFile, writeFile, copyFile, unlink } from 'node:fs/promises';

export interface FixResult {
  projectPath: string;
  success: boolean;
  backupPath?: string;
  error?: string;
}

export async function applyFix(
  settingsPath: string,
  projectPath: string,
  mode: FixMode
): Promise<FixResult> {
  // Step 1: Create backup
  const timestamp = formatTimestamp(new Date());
  const backupPath = `${settingsPath}.vibe-term-backup.${timestamp}`;

  try {
    await copyFile(settingsPath, backupPath);
  } catch (err) {
    return {
      projectPath,
      success: false,
      error: `Failed to create backup: ${(err as Error).message}`,
    };
  }

  // Step 2: Read current settings
  let settings: ClaudeSettings;
  try {
    const content = await readFile(settingsPath, 'utf-8');
    settings = JSON.parse(content);
  } catch (err) {
    return {
      projectPath,
      success: false,
      backupPath,
      error: `Failed to read settings: ${(err as Error).message}`,
    };
  }

  // Step 3: Apply fix
  let newSettings: ClaudeSettings;
  if (mode === 'merge') {
    newSettings = mergeHooks(settings);
  } else {
    // Remove hooks section
    const { hooks, ...rest } = settings;
    newSettings = rest;
  }

  // Step 4: Write new settings
  const newContent = JSON.stringify(newSettings, null, 2);
  try {
    await writeFile(settingsPath, newContent, 'utf-8');
  } catch (err) {
    return {
      projectPath,
      success: false,
      backupPath,
      error: `Failed to write settings: ${(err as Error).message}`,
    };
  }

  // Step 5: Validate written file (auto-restore if broken)
  try {
    const verifyContent = await readFile(settingsPath, 'utf-8');
    JSON.parse(verifyContent);  // Throws if invalid JSON
  } catch (err) {
    // Auto-restore from backup
    await copyFile(backupPath, settingsPath);
    return {
      projectPath,
      success: false,
      backupPath,
      error: `Settings file corrupted after write, restored from backup`,
    };
  }

  return {
    projectPath,
    success: true,
    backupPath,
  };
}
```

### Pattern 3: Interactive Per-Project Confirmation
**What:** Prompt user y/n for each project before applying fix
**When to use:** When --apply without --yes
**Example:**
```typescript
// In src/cli/fix.ts
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

async function confirmProject(
  projectPath: string,
  preview: FixPreview
): Promise<boolean> {
  // Skip prompt in CI or piped input
  if (!stdin.isTTY) {
    return true;
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const modeDescription = preview.mode === 'merge'
      ? 'Merge vibe-term hooks into project settings'
      : 'Remove project hooks (inherit from global)';

    const answer = await rl.question(
      `\nFix ${projectPath}?\n  Action: ${modeDescription}\n  [y/n] `
    );
    return answer === '' || /^y(es)?$/i.test(answer);
  } finally {
    rl.close();
  }
}
```

### Pattern 4: Before/After Display Format
**What:** Show hooks section before and after fix for clarity
**When to use:** Dry-run output and verbose mode
**Example:**
```typescript
// In src/cli/fix.ts
import { dim, cyan, heading, yellow, green } from './output.js';

function displayBeforeAfter(preview: FixPreview): void {
  console.log('');
  console.log(heading(truncatePath(preview.projectPath, 60)));
  console.log(dim(`  File: ${preview.settingsPath}`));
  console.log(dim(`  Mode: ${preview.mode === 'merge' ? 'Merge hooks' : 'Remove override'}`));

  // Before
  console.log('');
  console.log(yellow('  BEFORE (hooks section):'));
  if (preview.beforeHooks && Object.keys(preview.beforeHooks).length > 0) {
    const beforeJson = JSON.stringify(preview.beforeHooks, null, 2);
    for (const line of beforeJson.split('\n')) {
      console.log(dim(`    ${line}`));
    }
  } else {
    console.log(dim('    (no hooks)'));
  }

  // After
  console.log('');
  console.log(green('  AFTER (hooks section):'));
  if (preview.afterHooks && Object.keys(preview.afterHooks).length > 0) {
    const afterJson = JSON.stringify(preview.afterHooks, null, 2);
    for (const line of afterJson.split('\n')) {
      console.log(cyan(`    ${line}`));
    }
  } else {
    console.log(dim('    (hooks section removed - inherits global)'));
  }
}
```

### Pattern 5: Summary Table for Multiple Projects
**What:** Show summary of all projects needing fixes before details
**When to use:** When fixing multiple projects
**Example:**
```typescript
function displaySummaryTable(previews: FixPreview[]): void {
  console.log(heading('Projects to fix:'));
  console.log(dim('PATH'.padEnd(50) + 'MODE'));
  console.log(dim('-'.repeat(70)));

  for (const preview of previews) {
    if (preview.alreadyConfigured) continue;  // Skip already configured

    const path = truncatePath(preview.projectPath, 48);
    const mode = preview.mode === 'merge' ? 'merge' : 'remove';
    console.log(`${path.padEnd(50)} ${mode}`);
  }

  const count = previews.filter(p => !p.alreadyConfigured).length;
  console.log('');
  console.log(`${count} project(s) will be modified`);
}
```

### Anti-Patterns to Avoid
- **Modifying files in dry-run mode:** Dry-run must be read-only, generate preview only
- **Skipping backup before write:** Always backup, even for "simple" changes
- **Silent failure on individual project:** Report all failures at end, don't stop early
- **Overwriting without validation:** Always verify JSON is valid after write
- **Hardcoding paths:** Use existing service functions for path resolution
- **Blocking prompts in CI:** Check stdin.isTTY before prompting

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hook merging | Custom merge logic | hookMerger.mergeHooks() | Already handles all 11 events correctly |
| Installation detection | String matching | hookMerger.isVibeTermInstalled() | Handles nested hook structure |
| Backup creation | Manual copy | settingsService pattern | Consistent timestamp format |
| Project discovery | Directory walking | projectScanner.discoverProjects() | Handles sessions-index.json resolution |
| Pattern filtering | Regex | projectScanner.filterByPattern() | Uses micromatch for glob patterns |
| Conflict detection | Custom checks | conflictDetector.classifyProject() | Already classifies pass/warn/fail |

**Key insight:** The fix command is primarily orchestration of existing services. The main new code is the preview generation, before/after display, and per-project confirmation flow.

## Common Pitfalls

### Pitfall 1: Modifying Wrong Settings File
**What goes wrong:** Writing to global settings instead of project settings
**Why it happens:** Confusing settingsService (global) with project settings paths
**How to avoid:** Fix command ONLY modifies project settings (from DiscoveredProject.settingsPath), never global
**Warning signs:** Global hooks disappear after running fix

### Pitfall 2: Lost Existing Hooks on Merge
**What goes wrong:** Vibe-term hooks replace existing hooks instead of appending
**Why it happens:** Using assignment instead of spread/concat
**How to avoid:** Use existing mergeHooks() which appends: `merged.hooks[event] = [...existing, vibeTermConfig]`
**Warning signs:** Project's other hooks disappear after fix

### Pitfall 3: Broken JSON After Write
**What goes wrong:** Settings file becomes invalid JSON, breaking Claude Code
**Why it happens:** Partial write, encoding issues, or serialization bugs
**How to avoid:** Verify by parsing after write, auto-restore from backup if invalid
**Warning signs:** Claude Code errors about settings file

### Pitfall 4: Exit Code Inconsistency
**What goes wrong:** Returns 0 when some projects failed
**Why it happens:** Not tracking individual project failures
**How to avoid:** Track all results, return 1 if ANY project failed: `results.some(r => !r.success)`
**Warning signs:** CI passes when it should fail

### Pitfall 5: Prompt Hangs in CI
**What goes wrong:** Fix command hangs waiting for input in automated environment
**Why it happens:** readline.question() blocks forever without TTY
**How to avoid:** Check `stdin.isTTY` before prompting, auto-proceed in non-TTY
**Warning signs:** CI jobs timeout on fix command

### Pitfall 6: Double Application
**What goes wrong:** Running fix --apply twice duplicates vibe-term hooks
**Why it happens:** Not checking if already configured before merging
**How to avoid:** Check isVibeTermInstalled() before merge, skip with notice if already done
**Warning signs:** Multiple vibe-term hook entries in settings

### Pitfall 7: Backup Accumulation
**What goes wrong:** Dozens of backup files clutter ~/.claude/projects/
**Why it happens:** Each fix creates a new timestamped backup
**How to avoid:** This is acceptable behavior per project decision; user can clean manually
**Warning signs:** Many .vibe-term-backup.* files (expected, not a bug)

## Code Examples

Verified patterns from existing codebase:

### Confirmation Prompt Pattern (from setup.ts)
```typescript
// Source: src/cli/setup.ts lines 59-73
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

async function confirm(message: string): Promise<boolean> {
  // Skip prompt in CI or piped input
  if (!stdin.isTTY) {
    return true;
  }

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`${message} [Y/n] `);
    // Empty answer (Enter) or "y"/"yes" means confirm
    return answer === '' || /^y(es)?$/i.test(answer);
  } finally {
    rl.close();
  }
}
```

### Backup and Write Pattern (from settingsService.ts)
```typescript
// Source: src/services/settingsService.ts lines 63-80
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
```

### Hook Merge Pattern (from hookMerger.ts)
```typescript
// Source: src/services/hookMerger.ts lines 114-134
export function mergeHooks(settings: ClaudeSettings): ClaudeSettings {
  // Create shallow copy of settings
  const merged: ClaudeSettings = { ...settings };

  // Create shallow copy of hooks or empty object
  merged.hooks = { ...settings.hooks };

  // Add vibe-term hooks to each event
  for (const event of HOOK_EVENTS) {
    // Get existing array for this event (or empty array)
    const existingConfigs = merged.hooks[event] ?? [];

    // Create vibe-term hook config for this event
    const vibeTermConfig = createHookConfig(event);

    // Append vibe-term config to existing array
    merged.hooks[event] = [...existingConfigs, vibeTermConfig];
  }

  return merged;
}
```

### Exit Codes Pattern (from audit.ts)
```typescript
// Source: src/cli/audit.ts lines 39-43
export const EXIT_CODES = {
  SUCCESS: 0,
  CONFLICTS_FOUND: 1,  // For fix: use PARTIAL_FAILURE for "some succeeded, some failed"
  ERROR: 2,
} as const;
```

### Complete Fix Command Entry Point
```typescript
// src/cli/fix.ts
import figures from 'figures';
import {
  success,
  error,
  warning,
  info,
  dim,
  green,
  yellow,
  heading,
  filePath,
} from './output.js';
import { readClaudeSettings, settingsFileExists } from '../services/settingsService.js';
import { isVibeTermInstalled } from '../services/hookMerger.js';
import { discoverProjects, filterByPattern } from '../services/projectScanner.js';
import { classifyProject } from '../services/conflictDetector.js';
import {
  generateFixPreview,
  applyFix,
  type FixPreview,
  type FixResult,
} from '../services/projectFixer.js';

export const EXIT_CODES = {
  SUCCESS: 0,
  PARTIAL_FAILURE: 1,  // Some projects failed
  ERROR: 2,            // Command couldn't run
} as const;

export interface FixOptions {
  apply: boolean;       // Execute changes (vs dry-run)
  yes: boolean;         // Skip confirmation prompts
  verbose: boolean;     // Show detailed output
  pattern?: string;     // Glob pattern or path
}

export async function runFix(options: FixOptions): Promise<number> {
  const { apply, yes, verbose, pattern } = options;

  // Step 1: Verify global hooks are installed
  if (!await settingsFileExists()) {
    error('Global settings not found. Run `vibe-term setup` first.');
    return EXIT_CODES.ERROR;
  }

  const globalSettings = await readClaudeSettings();
  if (!isVibeTermInstalled(globalSettings)) {
    error('vibe-term hooks not installed. Run `vibe-term setup` first.');
    return EXIT_CODES.ERROR;
  }

  // Step 2: Discover and filter projects
  let projects = await discoverProjects();
  if (pattern) {
    projects = filterByPattern(projects, pattern);
  }

  // Step 3: Find projects needing fixes (warn status from audit)
  const projectsToFix = [];
  for (const project of projects) {
    const result = await classifyProject(
      project.originalPath,
      project.settingsPath,
      project.localSettingsPath
    );
    if (result.status === 'warn' && project.settingsPath) {
      projectsToFix.push(project);
    }
  }

  if (projectsToFix.length === 0) {
    info('No projects need fixing.');
    return EXIT_CODES.SUCCESS;
  }

  // Step 4: Generate previews
  const previews: FixPreview[] = [];
  for (const project of projectsToFix) {
    // Default mode: merge (per CONTEXT.md decisions)
    const preview = await generateFixPreview(
      project.originalPath,
      project.settingsPath!,
      'merge'  // TODO: Could prompt for mode choice per project
    );
    if (!preview.alreadyConfigured) {
      previews.push(preview);
    }
  }

  if (previews.length === 0) {
    info('All projects already configured.');
    return EXIT_CODES.SUCCESS;
  }

  // Step 5: Display summary and previews
  displaySummaryTable(previews);
  if (verbose || !apply) {
    for (const preview of previews) {
      displayBeforeAfter(preview);
    }
  }

  // Step 6: Dry-run stops here
  if (!apply) {
    console.log('');
    info('Dry run complete. Use --apply to execute changes.');
    return EXIT_CODES.SUCCESS;
  }

  // Step 7: Apply fixes with optional per-project confirmation
  const results: FixResult[] = [];
  for (const preview of previews) {
    // Confirm unless --yes
    if (!yes) {
      const confirmed = await confirmProject(preview.projectPath, preview);
      if (!confirmed) {
        info(`Skipped: ${preview.projectPath}`);
        continue;
      }
    }

    const result = await applyFix(
      preview.settingsPath,
      preview.projectPath,
      preview.mode
    );
    results.push(result);

    if (result.success) {
      success(`Fixed: ${preview.projectPath}`);
      if (result.backupPath) {
        info(`  Backup: ${filePath(result.backupPath)}`);
      }
    } else {
      error(`Failed: ${preview.projectPath}`);
      error(`  ${result.error}`);
    }
  }

  // Step 8: Summary
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log('');
  console.log(
    `Fixed ${green(successCount + ' project(s)')}, ` +
    `${failCount > 0 ? yellow(failCount + ' failed') : 'none failed'}`
  );

  // Step 9: Exit code
  return failCount > 0 ? EXIT_CODES.PARTIAL_FAILURE : EXIT_CODES.SUCCESS;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| write-file-atomic | Native fs + verify | Current | Simpler, no dep, just verify after write |
| inquirer.js | readline/promises | Node 17+ | Native async prompts, no dependency |
| Manual backup rotation | Keep all backups | Project decision | Simpler, user manages cleanup |

**Deprecated/outdated:**
- `readline.createInterface` without `/promises`: Use `readline/promises` for async/await
- `fs.writeFileSync`: Use `fs/promises.writeFile` for non-blocking

## Open Questions

Things that couldn't be fully resolved:

1. **Mode selection per project**
   - What we know: CONTEXT.md says "offer two resolution modes per project"
   - What's unclear: Should this be a prompt during fix, or a flag like `--mode=merge|remove`?
   - Recommendation: Default to merge mode, could add `--remove-override` flag if needed later

2. **Local settings handling**
   - What we know: Projects can have both `.claude/settings.json` and `.claude/settings.local.json`
   - What's unclear: Should fix handle local settings, or just shared?
   - Recommendation: Focus on shared settings first; local settings typically user-specific

3. **Backup cleanup**
   - What we know: Multiple backups accumulate with timestamps
   - What's unclear: Should fix offer cleanup option?
   - Recommendation: Out of scope for MVP; users can manage manually

## Sources

### Primary (HIGH confidence)
- Existing project code: src/cli/setup.ts (confirm pattern), src/cli/audit.ts (discovery flow)
- Existing project code: src/services/settingsService.ts (backup/write), src/services/hookMerger.ts (merge logic)
- Node.js documentation: fs/promises, readline/promises

### Secondary (MEDIUM confidence)
- [write-file-atomic npm](https://www.npmjs.com/package/write-file-atomic) - Pattern reference for atomic writes
- [Node.js readline docs](https://nodejs.org/api/readline.html) - Prompt patterns
- [DEV Community article on crash-safe JSON](https://dev.to/constanta/crash-safe-json-at-scale-atomic-writes-recovery-without-a-db-3aic) - Auto-restore pattern

### Tertiary (LOW confidence)
- WebSearch results on CLI confirmation patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project dependencies only
- Architecture: HIGH - Building directly on Phase 14 patterns
- Pitfalls: HIGH - Based on existing codebase analysis and CONTEXT.md decisions

**Research date:** 2026-01-31
**Valid until:** 2026-03-02 (30 days - building on stable existing patterns)

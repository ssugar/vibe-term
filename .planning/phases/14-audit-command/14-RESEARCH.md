# Phase 14: Audit Command - Research

**Researched:** 2026-01-31
**Domain:** CLI command implementation, directory scanning, hook conflict detection
**Confidence:** HIGH

## Summary

This research establishes how to implement the `vibe-term audit` command that scans for hook conflicts between per-project settings and vibe-term's global hooks. The phase builds on Phase 13's CLI router pattern and Phase 12's foundation services (output utilities, settings service, hook merger).

The key insight from research is that Claude Code stores project metadata in `~/.claude/projects/[encoded-path]/sessions-index.json`, which contains an `originalPath` field pointing to the actual project directory. Project-level hooks are stored in `.claude/settings.json` (shared) and `.claude/settings.local.json` (local) within that project directory - NOT in ~/.claude/projects/. The audit command must decode this mapping to find and check project settings.

Conflict detection logic is straightforward: a project has hooks that could conflict if it defines hooks for the same events as vibe-term's global hooks. Per CONTEXT.md, "same event with different script = PASS (not a conflict - they can coexist)", so the only real conflicts are malformed JSON (FAIL) or scenarios where hooks can be auto-merged (WARN).

**Primary recommendation:** Create `src/cli/audit.ts` following the setup.ts pattern, with a `ProjectScanner` service to handle directory discovery and a `ConflictDetector` service to classify projects. Use the existing `cli/output.ts` utilities for consistent colored table output.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| picocolors | 1.1.x | Terminal colors | Already in project, used by output.ts |
| figures | 6.1.0 | Status symbols | Already in project, provides tick/cross/warning |
| meow | 14.x | CLI parsing | Already in project, handles flags and positional args |
| fs/promises | built-in | Directory scanning | Native async file operations |
| micromatch | 4.x | Glob pattern matching | Standard for glob matching, faster than minimatch |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| minimatch | 10.x | Glob patterns | Alternative to micromatch, more widely used |
| path | built-in | Path manipulation | Cross-platform path joining |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| micromatch | minimatch | minimatch more compatible but slower |
| micromatch | picomatch | picomatch lighter but fewer features |
| manual table | cli-table3 | Library adds dependency, simple sprintf sufficient |

**Installation:**
```bash
npm install micromatch
npm install -D @types/micromatch
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/
│   ├── output.ts           # Existing - colors and symbols
│   ├── setup.ts            # Existing - setup command
│   └── audit.ts            # NEW - audit command entry point
├── services/
│   ├── settingsService.ts  # Existing - read global settings
│   ├── hookMerger.ts       # Existing - isVibeTermInstalled
│   ├── projectScanner.ts   # NEW - discover projects from ~/.claude/projects/
│   └── conflictDetector.ts # NEW - classify projects as pass/warn/fail
```

### Pattern 1: Project Scanner Service
**What:** Service to discover all Claude projects from ~/.claude/projects/
**When to use:** Audit command initialization
**Example:**
```typescript
// src/services/projectScanner.ts
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

export interface DiscoveredProject {
  encodedName: string;        // e.g., "-home-ssugar-claude-vibe-term"
  originalPath: string;       // e.g., "/home/ssugar/claude/vibe-term"
  settingsPath: string | null;      // Path to .claude/settings.json if exists
  localSettingsPath: string | null; // Path to .claude/settings.local.json if exists
}

export async function discoverProjects(): Promise<DiscoveredProject[]> {
  const entries = await readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true });
  const projects: DiscoveredProject[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const sessionsIndexPath = join(CLAUDE_PROJECTS_DIR, entry.name, 'sessions-index.json');
    try {
      const content = await readFile(sessionsIndexPath, 'utf-8');
      const index = JSON.parse(content);
      if (index.originalPath) {
        const projectSettingsPath = join(index.originalPath, '.claude', 'settings.json');
        const localSettingsPath = join(index.originalPath, '.claude', 'settings.local.json');

        projects.push({
          encodedName: entry.name,
          originalPath: index.originalPath,
          settingsPath: await fileExists(projectSettingsPath) ? projectSettingsPath : null,
          localSettingsPath: await fileExists(localSettingsPath) ? localSettingsPath : null,
        });
      }
    } catch {
      // Skip directories without valid sessions-index.json
      continue;
    }
  }

  return projects;
}
```

### Pattern 2: Conflict Detector Service
**What:** Classify projects based on their hook configurations
**When to use:** After project discovery
**Example:**
```typescript
// src/services/conflictDetector.ts
import { readFile } from 'fs/promises';
import type { ClaudeSettings } from './settingsService.js';

export type ConflictStatus = 'pass' | 'warn' | 'fail';

export interface ProjectAuditResult {
  path: string;
  status: ConflictStatus;
  issues: string[];
}

export async function classifyProject(
  projectPath: string,
  settingsPath: string | null,
  localSettingsPath: string | null
): Promise<ProjectAuditResult> {
  const issues: string[] = [];

  // Check shared settings
  if (settingsPath) {
    try {
      const content = await readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(content) as ClaudeSettings;
      if (settings.hooks && Object.keys(settings.hooks).length > 0) {
        issues.push('Project has shared hooks (.claude/settings.json)');
      }
    } catch (error) {
      if ((error as Error).message.includes('JSON')) {
        return { path: projectPath, status: 'fail', issues: ['Malformed .claude/settings.json'] };
      }
      // File read error - ignore
    }
  }

  // Check local settings
  if (localSettingsPath) {
    try {
      const content = await readFile(localSettingsPath, 'utf-8');
      const settings = JSON.parse(content) as ClaudeSettings;
      if (settings.hooks && Object.keys(settings.hooks).length > 0) {
        issues.push('Project has local hooks (.claude/settings.local.json)');
      }
    } catch (error) {
      if ((error as Error).message.includes('JSON')) {
        return { path: projectPath, status: 'fail', issues: ['Malformed .claude/settings.local.json'] };
      }
    }
  }

  // Classify: no hooks = pass, has hooks = warn (can be auto-merged)
  if (issues.length === 0) {
    return { path: projectPath, status: 'pass', issues: [] };
  }
  return { path: projectPath, status: 'warn', issues };
}
```

### Pattern 3: CLI Table Output
**What:** Formatted table output with status symbols
**When to use:** Displaying audit results
**Example:**
```typescript
// In src/cli/audit.ts
import pc from 'picocolors';
import figures from 'figures';

function formatStatus(status: ConflictStatus): string {
  switch (status) {
    case 'pass': return pc.green(figures.tick);
    case 'warn': return pc.yellow(figures.warning);
    case 'fail': return pc.red(figures.cross);
  }
}

function displayResults(results: ProjectAuditResult[], verbose: boolean): void {
  // Header
  console.log(pc.dim('PATH'.padEnd(50) + 'STATUS  ISSUES'));
  console.log(pc.dim('-'.repeat(70)));

  for (const result of results) {
    const path = truncatePath(result.path, 48);
    const status = formatStatus(result.status);
    const issueCount = result.issues.length > 0 ? String(result.issues.length) : '-';

    console.log(`${path.padEnd(50)} ${status}      ${issueCount}`);
  }

  // Summary line
  const passCount = results.filter(r => r.status === 'pass').length;
  const warnCount = results.filter(r => r.status === 'warn').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  console.log('');
  console.log(`Scanned ${results.length} projects: ${pc.green(passCount + ' pass')}, ${pc.yellow(warnCount + ' warn')}, ${pc.red(failCount + ' fail')}`);
}
```

### Pattern 4: Glob Pattern Filtering
**What:** Filter projects by glob pattern for targeted audits
**When to use:** When user provides pattern argument
**Example:**
```typescript
import micromatch from 'micromatch';

function filterProjects(
  projects: DiscoveredProject[],
  pattern?: string
): DiscoveredProject[] {
  if (!pattern) return projects;

  // Match against originalPath
  const paths = projects.map(p => p.originalPath);
  const matches = micromatch(paths, pattern);

  return projects.filter(p => matches.includes(p.originalPath));
}
```

### Anti-Patterns to Avoid
- **Decoding project paths from directory names:** Use sessions-index.json's originalPath field instead
- **Checking ~/.claude/projects/ for settings:** Settings are in the actual project directory's .claude/ folder
- **Treating all hooks as conflicts:** Per CONTEXT.md, different scripts on same event = PASS
- **Sync fs operations:** Use async fs/promises for non-blocking scanning
- **Hardcoding status symbols:** Use figures library for cross-platform compatibility

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Glob matching | Regex patterns | micromatch | Handles ** patterns, negation, edge cases |
| Path truncation | String slicing | Custom function with ellipsis | Need to preserve meaningful parts |
| Status symbols | Unicode literals | figures library | Windows fallbacks |
| Terminal colors | ANSI escapes | picocolors | Auto-detects color support |
| JSON parsing | eval | JSON.parse in try/catch | Security, error handling |

**Key insight:** The main complexity is understanding where Claude Code stores data. The encoding in ~/.claude/projects/ is NOT directly decodable - must read sessions-index.json to get the original project path.

## Common Pitfalls

### Pitfall 1: Wrong Settings Location
**What goes wrong:** Looking for settings in ~/.claude/projects/[encoded]/settings.json
**Why it happens:** Assumption that project settings are with project session data
**How to avoid:** Settings are in `$originalPath/.claude/settings.json` where originalPath comes from sessions-index.json
**Warning signs:** "Settings not found" for all projects

### Pitfall 2: Path Encoding Ambiguity
**What goes wrong:** Trying to decode `-home-user-my-project` by replacing dashes with slashes
**Why it happens:** Hyphens appear both as path separators AND in actual directory names
**How to avoid:** Always read originalPath from sessions-index.json, never decode from directory name
**Warning signs:** Decoded paths don't exist on filesystem

### Pitfall 3: Missing sessions-index.json
**What goes wrong:** Crash when scanning project directory without sessions-index.json
**Why it happens:** Some directories in ~/.claude/projects/ may be orphaned or incomplete
**How to avoid:** Wrap in try/catch, skip directories that can't be read
**Warning signs:** ENOENT errors during scan

### Pitfall 4: Hooks Structure Mismatch
**What goes wrong:** Treating hooks as simple key-value when it's nested array
**Why it happens:** Not checking actual Claude settings structure
**How to avoid:** Use existing ClaudeSettings and HookConfig types from settingsService.ts
**Warning signs:** TypeError when accessing hooks properties

### Pitfall 5: Exit Code in All Cases
**What goes wrong:** Returning 0 even when failures found
**Why it happens:** Forgetting to check for fail status before returning
**How to avoid:** Explicit check: `results.some(r => r.status === 'fail') ? 1 : 0`
**Warning signs:** CI scripts pass when they should fail

### Pitfall 6: Global Hooks Not Installed
**What goes wrong:** Audit runs when vibe-term hooks aren't set up
**Why it happens:** User runs audit before setup
**How to avoid:** Check isVibeTermInstalled() first, error with "Run setup first" message
**Warning signs:** Confusing results, no reference point for conflicts

## Code Examples

Verified patterns from official sources:

### Complete Audit Command Entry Point
```typescript
// src/cli/audit.ts
import { success, error, warning, info, filePath, dim, bold, green, yellow, red } from './output.js';
import { readClaudeSettings, settingsFileExists } from '../services/settingsService.js';
import { isVibeTermInstalled } from '../services/hookMerger.js';
import { discoverProjects, type DiscoveredProject } from '../services/projectScanner.js';
import { classifyProject, type ProjectAuditResult } from '../services/conflictDetector.js';
import figures from 'figures';
import pc from 'picocolors';

export const EXIT_CODES = {
  SUCCESS: 0,
  CONFLICTS_FOUND: 1,
  ERROR: 2,
} as const;

export interface AuditOptions {
  failOnly: boolean;
  verbose: boolean;
  pattern?: string;
}

export async function runAudit(options: AuditOptions): Promise<number> {
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
  if (options.pattern) {
    projects = filterByPattern(projects, options.pattern);
    if (projects.length === 0) {
      warning(`No projects match pattern: ${options.pattern}`);
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
  const displayResults = options.failOnly
    ? results.filter(r => r.status === 'fail')
    : results;

  // Step 6: Display results
  displayTable(displayResults, options.verbose);

  // Step 7: Show verbose details if requested
  if (options.verbose) {
    displayVerboseDetails(results);
  }

  // Step 8: Summary
  displaySummary(results);

  // Step 9: Return exit code
  const hasFailures = results.some(r => r.status === 'fail');
  return hasFailures ? EXIT_CODES.CONFLICTS_FOUND : EXIT_CODES.SUCCESS;
}
```

### CLI Router Addition
```typescript
// In src/cli.tsx, add to command routing:
if (command === 'audit') {
  const { runAudit } = await import('./cli/audit.js');
  const exitCode = await runAudit({
    failOnly: cli.flags.failOnly,
    verbose: cli.flags.verbose,
    pattern: cli.input[1], // Second positional arg is pattern
  });
  process.exit(exitCode);
}
```

### Meow Flags Configuration
```typescript
// Add to meow flags:
flags: {
  // ... existing flags ...
  failOnly: {
    type: 'boolean',
    default: false,
  },
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| fs.readdirSync | fs/promises readdir | Node 14+ | Async, non-blocking |
| glob package | micromatch/fast-glob | 2023+ | Better performance |
| console colors | picocolors | 2024+ | Smaller, faster |

**Deprecated/outdated:**
- `glob` package: Still works but micromatch/fast-glob preferred for performance
- `chalk@4.x`: Use chalk@5+ or picocolors for ESM

## Open Questions

Things that couldn't be fully resolved:

1. **Grouping by conflict type (AUDIT-08)**
   - What we know: Requirement says "Audit groups projects by conflict type"
   - What's unclear: What conflict types exist beyond pass/warn/fail?
   - Recommendation: Interpret as grouping output by status in verbose mode

2. **Single project audit path derivation**
   - What we know: User can provide `/path/to/project` as positional arg
   - What's unclear: Should we check if path is in ~/.claude/projects/ or just check .claude/ directly?
   - Recommendation: Just check the path directly for .claude/settings*.json, no need to verify it's a "known" project

3. **Hook mergeability detection**
   - What we know: WARN status means "vibe-term can auto-merge/fix them"
   - What's unclear: Exact criteria for what's mergeable vs not
   - Recommendation: Any valid JSON with hooks is mergeable; only malformed JSON is FAIL

## Sources

### Primary (HIGH confidence)
- Existing project code: src/cli/setup.ts, src/services/settingsService.ts, src/services/hookMerger.ts
- Claude Code official docs: https://code.claude.com/docs/en/settings - Settings hierarchy
- Node.js fs/promises documentation

### Secondary (MEDIUM confidence)
- [micromatch GitHub](https://github.com/micromatch/micromatch) - Glob pattern API
- [picocolors GitHub](https://github.com/alexeyraspopov/picocolors) - Color functions
- [figures npm](https://www.npmjs.com/package/figures) - Status symbols

### Tertiary (LOW confidence)
- WebSearch results on CLI table formatting patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Building on existing project patterns
- Architecture: HIGH - Follows established Phase 13 patterns
- Pitfalls: HIGH - Based on direct investigation of Claude Code data structures

**Research date:** 2026-01-31
**Valid until:** 2026-03-02 (30 days - stable patterns, building on existing code)

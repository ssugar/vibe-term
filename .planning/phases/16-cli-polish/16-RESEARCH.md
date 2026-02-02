# Phase 16: CLI Polish - Research

**Researched:** 2026-02-02
**Domain:** CLI machine-readable output (JSON), contextual action suggestions
**Confidence:** HIGH

## Summary

This research establishes patterns for adding `--json` flag support to all vibe-term CLI commands (setup, audit, fix) and implementing contextual action suggestions that guide users to logical next steps. The phase polishes existing commands rather than adding new functionality.

The key finding is that **JSON output should follow a consistent envelope structure** with metadata (timestamp, version, duration) and an `errors[]` array field that's empty on success. Based on industry standards (AWS CLI, Azure CLI, GitHub CLI, and the Command Line Interface Guidelines at clig.dev), all machine-readable output goes to stdout, with stderr reserved for human-readable messages - but since CONTEXT.md specifies "stderr is silent in JSON mode", all output including warnings must be captured in the JSON structure.

For action suggestions, the research confirms **inline suggestions with contextual triggers** are the standard pattern. Suggestions should appear immediately after relevant output (e.g., after setup completes, suggest audit; after audit finds issues, suggest fix). The highlighted action format from CONTEXT.md (`-> Run \`vibe-term audit\` to verify`) aligns with CLI UX best practices.

The existing codebase already uses **picocolors** for colors and **figures** for symbols, both of which have proper auto-detection for TTY and color support. The `--json` flag implementation needs to disable colors and modify the output flow to collect data structures instead of printing directly.

**Primary recommendation:** Create a centralized JSON output formatter that wraps command results in a consistent envelope, modify each command to return structured data instead of printing, and add suggestion logic based on command outcomes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| meow | 14.0.0 | CLI argument parsing | Already installed, handles `--json` boolean flag |
| picocolors | 1.1.x | Terminal colors | Already installed, has `isColorSupported` for detection |
| figures | 6.1.0 | Status symbols | Already installed, cross-platform tick/cross/warning/info |
| JSON (built-in) | native | JSON serialization | `JSON.stringify(data, null, 2)` for pretty-print |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cli/output.ts | local | Colored CLI output | Human-readable output mode |
| process.hrtime.bigint() | built-in | Duration measurement | Track command execution time for metadata |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual JSON format | ajv schema validation | Overkill for simple CLI output |
| picocolors | chalk | picocolors already installed, 14x smaller |
| Custom envelope | JSON-RPC format | Too complex, not standard for CLIs |

**Installation:**
```bash
# No new dependencies needed - all already installed or built-in
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli.tsx              # Entry point with --json flag parsing
├── cli/
│   ├── output.ts        # Colored CLI output utilities (existing)
│   ├── json.ts          # JSON output formatter (NEW)
│   ├── suggestions.ts   # Action suggestion logic (NEW)
│   ├── setup.ts         # Setup command (modify for JSON)
│   ├── audit.ts         # Audit command (modify for JSON)
│   └── fix.ts           # Fix command (modify for JSON)
└── services/
    └── ...              # Unchanged
```

### Pattern 1: JSON Output Envelope
**What:** Consistent wrapper structure for all JSON output
**When to use:** Any command when `--json` flag is passed
**Example:**
```typescript
// src/cli/json.ts

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
    timestamp: string;      // ISO 8601 format
    version: string;        // vibe-term version from package.json
    duration_ms: number;    // Command execution time
    command: string;        // Command that was run (e.g., "setup", "audit")
  };
}

export interface JsonError {
  category: string;     // e.g., "FILE", "CONFIG", "PARSE"
  message: string;
}

export interface JsonSuggestion {
  action: string;       // e.g., "Run `vibe-term audit` to verify"
  command: string;      // e.g., "vibe-term audit"
  reason: string;       // e.g., "Setup completed successfully"
}

/**
 * Create a JSON output wrapper.
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
      version: getVersion(),  // Read from package.json
      duration_ms: Math.round(duration_ms * 100) / 100,
      command,
    },
  };
}

/**
 * Output JSON to stdout with no extra formatting.
 */
export function outputJson<T>(output: JsonOutput<T>): void {
  console.log(JSON.stringify(output, null, 2));
}
```

### Pattern 2: Command Result Types
**What:** Typed return values from each command for JSON serialization
**When to use:** Each command's core logic
**Example:**
```typescript
// Setup command data type
export interface SetupResult {
  installed: boolean;       // true if hooks were installed
  already_installed: boolean;
  hook_script_path?: string;
  settings_path?: string;
  backup_path?: string;
}

// Audit command data type
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

// Fix command data type
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
```

### Pattern 3: Dual-Mode Output Functions
**What:** Output functions that respect --json flag
**When to use:** Any place that produces output
**Example:**
```typescript
// src/cli/output.ts (enhanced)

// Global context for output mode
let jsonMode = false;
let collectedErrors: JsonError[] = [];
let collectedSuggestions: JsonSuggestion[] = [];

export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
  collectedErrors = [];
  collectedSuggestions = [];
}

export function isJsonMode(): boolean {
  return jsonMode;
}

/**
 * Print a success message or collect for JSON output
 */
export function success(message: string): void {
  if (!jsonMode) {
    console.log(`${pc.green(figures.tick)} ${message}`);
  }
  // In JSON mode, success is part of the data structure, not collected
}

/**
 * Print an error or collect for JSON output
 */
export function error(message: string, category = 'GENERAL'): void {
  if (jsonMode) {
    collectedErrors.push({ category, message });
  } else {
    console.log(`${pc.red(figures.cross)} ${message}`);
  }
}

/**
 * Add a suggestion (human mode prints inline, JSON collects)
 */
export function suggest(action: string, command: string, reason: string): void {
  if (jsonMode) {
    collectedSuggestions.push({ action, command, reason });
  } else {
    console.log(`${pc.cyan('->')} ${action}`);
  }
}

export function getCollectedErrors(): JsonError[] {
  return collectedErrors;
}

export function getCollectedSuggestions(): JsonSuggestion[] {
  return collectedSuggestions;
}
```

### Pattern 4: Contextual Action Suggestions
**What:** Logic for determining what suggestion to show based on command outcome
**When to use:** After each command completes
**Example:**
```typescript
// src/cli/suggestions.ts

/**
 * Get suggestion after setup command
 */
export function getSetupSuggestion(result: SetupResult): JsonSuggestion | null {
  if (result.installed) {
    return {
      action: 'Run `vibe-term audit` to verify',
      command: 'vibe-term audit',
      reason: 'Setup completed successfully',
    };
  }
  return null;
}

/**
 * Get suggestion after audit command
 */
export function getAuditSuggestion(result: AuditResult): JsonSuggestion | null {
  if (result.warn > 0 || result.fail > 0) {
    return {
      action: 'Run `vibe-term fix` to resolve issues',
      command: 'vibe-term fix',
      reason: `Found ${result.warn} warnings and ${result.fail} failures`,
    };
  }
  return null;
}

/**
 * Get suggestion after fix command
 */
export function getFixSuggestion(result: FixResult, dryRun: boolean): JsonSuggestion | null {
  if (dryRun) {
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
```

### Pattern 5: Interactive Prompt Behavior in JSON Mode
**What:** Skip interactive prompts when --json is active
**When to use:** Any command with confirmation prompts (setup, fix)
**Example:**
```typescript
// In setup.ts and fix.ts

async function confirm(message: string, options: { json: boolean; yes: boolean }): Promise<boolean> {
  // JSON mode implies non-interactive - skip all prompts
  if (options.json) {
    // In JSON mode without --yes, we should fail rather than silently proceeding
    if (!options.yes) {
      throw new Error('Confirmation required but --json mode is non-interactive. Use --yes to skip confirmation.');
    }
    return true;
  }

  // Skip prompt in CI or piped input
  if (!stdin.isTTY) {
    return true;
  }

  // Skip prompt if --yes flag
  if (options.yes) {
    return true;
  }

  // Interactive prompt
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`${message} [Y/n] `);
    return answer === '' || /^y(es)?$/i.test(answer);
  } finally {
    rl.close();
  }
}
```

### Pattern 6: Strict Symbol and Color Vocabulary
**What:** Consistent symbols and colors per CONTEXT.md
**When to use:** All human-readable output
**Example:**
```typescript
// src/cli/output.ts - Symbol mapping

import pc from 'picocolors';
import figures from 'figures';

// Strict symbol vocabulary per CONTEXT.md
export const SYMBOLS = {
  success: figures.tick,    // Checkmark
  error: figures.cross,     // X
  warning: figures.warning, // Triangle with !
  info: figures.bullet,     // Bullet point (not info symbol)
} as const;

// Strict color mapping per CONTEXT.md
export const COLORS = {
  success: pc.green,
  warning: pc.yellow,
  error: pc.red,
  info: pc.cyan,
} as const;

// Formatted output functions
export function success(message: string): void {
  if (!isJsonMode()) {
    console.log(`${COLORS.success(SYMBOLS.success)} ${message}`);
  }
}

export function error(message: string): void {
  if (!isJsonMode()) {
    console.log(`${COLORS.error(SYMBOLS.error)} ${message}`);
  }
}

export function warning(message: string): void {
  if (!isJsonMode()) {
    console.log(`${COLORS.warning(SYMBOLS.warning)} ${message}`);
  }
}

export function info(message: string): void {
  if (!isJsonMode()) {
    console.log(`${COLORS.info(SYMBOLS.info)} ${message}`);
  }
}
```

### Anti-Patterns to Avoid
- **Mixing stdout and stderr in JSON mode:** All output goes to JSON, stderr is silent
- **Using console.log in command logic:** Use output helpers that respect JSON mode
- **Forgetting to disable colors in JSON mode:** picocolors should not color JSON output
- **Hardcoding suggestion text:** Use suggestion functions for consistency
- **Ignoring exit codes in JSON mode:** Exit codes remain consistent regardless of output mode
- **Prompting in JSON mode without --yes:** Either auto-fail or require --yes flag

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Duration timing | Date math | process.hrtime.bigint() | Nanosecond precision, no overflow |
| Color detection | Check TERM env | picocolors.isColorSupported | Handles CI, Windows, NO_COLOR |
| Symbol fallbacks | Manual conditionals | figures package | Cross-platform with fallbacks |
| Version reading | Hardcode | Read package.json | Stays in sync automatically |
| JSON pretty-print | Custom formatting | JSON.stringify(data, null, 2) | Standard, tested, fast |

**Key insight:** The complexity is in refactoring existing commands to separate data collection from output, not in the JSON formatting itself.

## Common Pitfalls

### Pitfall 1: Partial JSON Output on Errors
**What goes wrong:** Error midway through command produces partial/invalid JSON
**Why it happens:** console.log called before JSON envelope is complete
**How to avoid:** Collect all data first, output JSON envelope once at the end
**Warning signs:** JSON parse errors when piping to jq

### Pitfall 2: Colors Leaking into JSON
**What goes wrong:** ANSI escape codes in JSON string values
**Why it happens:** picocolors wrapping strings that end up in JSON data
**How to avoid:** Call picocolors only in human-readable output path, not data collection
**Warning signs:** Strings with \x1b[ sequences in JSON output

### Pitfall 3: Interactive Prompts Hanging JSON Consumers
**What goes wrong:** Script expecting JSON waits forever at prompt
**Why it happens:** readline.question() blocks waiting for input
**How to avoid:** Check JSON mode before prompting, require --yes or fail with error
**Warning signs:** CI pipelines hang at "Continue? [Y/n]"

### Pitfall 4: Inconsistent Exit Codes
**What goes wrong:** Scripts relying on exit codes get different behavior with --json
**Why it happens:** Different code paths for JSON vs human output
**How to avoid:** Set exit code at the end based on success/failure, not output mode
**Warning signs:** `echo $?` gives different values for same operation

### Pitfall 5: Missing Error Details in JSON
**What goes wrong:** JSON shows failure but no useful error message
**Why it happens:** Error messages go to stderr, not captured in JSON
**How to avoid:** All errors must go into the errors[] array
**Warning signs:** `"errors": []` but `"success": false`

### Pitfall 6: Suggestions Without Context
**What goes wrong:** Suggestions appear even when not actionable
**Why it happens:** Always-on suggestion logic without checking outcome
**How to avoid:** Suggestions are contextual - only show when there's a logical next step
**Warning signs:** "Run `vibe-term fix`" when there are no issues

## Code Examples

Verified patterns from official sources:

### Complete JSON-Aware Setup Command
```typescript
// src/cli/setup.ts (modified for JSON support)
import {
  success,
  error,
  info,
  warning,
  filePath,
  cyan,
  heading,
  setJsonMode,
  isJsonMode,
  getCollectedErrors,
  getCollectedSuggestions,
} from './output.js';
import { createJsonOutput, outputJson, type JsonOutput } from './json.js';
import { getSetupSuggestion, type SetupResult } from './suggestions.js';

interface SetupOptions {
  yes: boolean;
  verbose: boolean;
  json: boolean;
}

export async function runSetup(options: SetupOptions): Promise<number> {
  const startTime = process.hrtime.bigint();
  setJsonMode(options.json);

  const result: SetupResult = {
    installed: false,
    already_installed: false,
  };

  // ... existing setup logic, but using result object ...

  // At the end, output based on mode
  if (isJsonMode()) {
    const suggestion = getSetupSuggestion(result);
    const output = createJsonOutput('setup', result, {
      success: result.installed || result.already_installed,
      errors: getCollectedErrors(),
      suggestions: suggestion ? [suggestion] : [],
      startTime,
    });
    outputJson(output);
  } else {
    // Existing human-readable output
    if (result.installed) {
      console.log('');
      success('vibe-term hooks installed successfully!');
      const suggestion = getSetupSuggestion(result);
      if (suggestion) {
        info(`${cyan('->')} ${suggestion.action}`);
      }
    }
  }

  return result.installed || result.already_installed
    ? EXIT_CODES.SUCCESS
    : EXIT_CODES.ERROR;
}
```

### Adding --json Flag to CLI Router
```typescript
// src/cli.tsx (additions)

const cli = meow(
  `
  Usage
    $ vibe-term           Launch TUI (default)
    $ vibe-term setup     Install global hooks
    $ vibe-term audit     Scan projects for conflicts
    $ vibe-term fix       Fix hook conflicts

  Commands
    setup     Install hooks to ~/.claude/settings.json
    audit     Scan ~/.claude/projects/ for hook conflicts
    fix       Fix hook conflicts in project settings

  Options
    --refresh, -r  Refresh interval in seconds (default: 2)
    --yes          Skip confirmation prompts (setup/fix)
    --verbose, -v  Show detailed output
    --fail-only    Show only failing projects (audit only)
    --apply        Execute changes (fix only, default is dry-run)
    --json         Output machine-readable JSON
`,
  {
    importMeta: import.meta,
    flags: {
      refresh: { type: 'number', shortFlag: 'r', default: 2 },
      yes: { type: 'boolean', default: false },
      verbose: { type: 'boolean', shortFlag: 'v', default: false },
      failOnly: { type: 'boolean', default: false },
      apply: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
  }
);

// Pass json flag to commands
if (command === 'setup') {
  const { runSetup } = await import('./cli/setup.js');
  const exitCode = await runSetup({
    yes: cli.flags.yes,
    verbose: cli.flags.verbose,
    json: cli.flags.json,
  });
  process.exit(exitCode);
}
```

### Sample JSON Output (Audit Command)
```json
{
  "success": false,
  "data": {
    "scanned": 5,
    "pass": 3,
    "warn": 1,
    "fail": 1,
    "projects": [
      { "path": "/home/user/project-a", "status": "pass", "issues": [] },
      { "path": "/home/user/project-b", "status": "pass", "issues": [] },
      { "path": "/home/user/project-c", "status": "warn", "issues": ["Project has shared hooks (.claude/settings.json)"] },
      { "path": "/home/user/project-d", "status": "fail", "issues": ["Malformed .claude/settings.json"] },
      { "path": "/home/user/project-e", "status": "pass", "issues": [] }
    ]
  },
  "errors": [],
  "suggestions": [
    {
      "action": "Run `vibe-term fix` to resolve issues",
      "command": "vibe-term fix",
      "reason": "Found 1 warnings and 1 failures"
    }
  ],
  "meta": {
    "timestamp": "2026-02-02T10:30:45.123Z",
    "version": "1.0.0",
    "duration_ms": 234.56,
    "command": "audit"
  }
}
```

### Disabling Colors for JSON Mode
```typescript
// src/cli/output.ts
import pc from 'picocolors';

// Store original color state
let colorsEnabled = pc.isColorSupported;

export function setJsonMode(enabled: boolean): void {
  jsonMode = enabled;
  if (enabled) {
    // Disable colors in JSON mode
    pc.disable?.();
  } else if (colorsEnabled) {
    // Restore colors if they were originally enabled
    pc.enable?.();
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| stderr for errors | All in JSON structure | 2024+ | Machine-readable even for errors |
| Inconsistent JSON | Envelope pattern | 2023+ | Predictable parsing |
| --format json | --json boolean | 2022+ | Simpler, common convention |
| No suggestions | Contextual hints | 2023+ | Better UX, guided workflows |

**Deprecated/outdated:**
- `--output-format json`: Verbose; `--json` is the modern convention
- Mixing human and JSON output: Either fully human or fully JSON
- stderr for "machine" errors: In JSON mode, all output is structured

## Open Questions

Things that couldn't be fully resolved:

1. **JSON Envelope vs Direct Data**
   - What we know: CONTEXT.md says Claude decides envelope structure
   - Decision made: Use envelope pattern for consistency (success, data, errors, suggestions, meta)
   - Rationale: Matches AWS CLI, Azure CLI, industry standards

2. **Interactive Prompt Behavior in JSON Mode**
   - What we know: CONTEXT.md says Claude decides
   - Decision made: Fail with error if --json without --yes when confirmation required
   - Rationale: Silent auto-proceed is dangerous; explicit --yes shows intent

3. **Version Field Source**
   - What we know: Need version in metadata
   - Recommendation: Read from package.json at startup, cache it
   - Rationale: Single source of truth, stays in sync

## Sources

### Primary (HIGH confidence)
- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/) - JSON output best practices, stdout/stderr rules
- [Rain's Rust CLI Recommendations](https://rust-cli-recommendations.sunshowers.io/machine-readable-output.html) - Machine-readable output, versioning
- [figures npm](https://github.com/sindresorhus/figures) - Cross-platform symbols
- [picocolors npm](https://github.com/alexeyraspopov/picocolors) - Color support detection, enable/disable
- Existing codebase: src/cli/output.ts, src/cli/setup.ts, src/cli/audit.ts, src/cli/fix.ts

### Secondary (MEDIUM confidence)
- [Azure CLI Output Formats](https://learn.microsoft.com/en-us/cli/azure/format-output-azure-cli) - JSON as default, envelope patterns
- [AWS CLI Output Formats](https://docs.aws.amazon.com/cli/v1/userguide/cli-usage-output-format.html) - JSON structure conventions
- [Kelly Brazil's JSON CLI Tips](https://blog.kellybrazil.com/2021/12/03/tips-on-adding-json-output-to-your-cli-app/) - Flat structure, naming conventions
- [CLI UX Patterns (lucasfcosta)](https://lucasfcosta.com/2022/06/01/ux-patterns-cli-tools.html) - Suggestions, next steps

### Tertiary (LOW confidence)
- [GitHub CLI Issues](https://github.com/cli/cli/issues/1089) - Community discussion on JSON format

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, well-documented
- Architecture: HIGH - Based on established CLI patterns and existing codebase
- Pitfalls: HIGH - Common issues well-documented in CLI guidelines
- JSON format: HIGH - Industry standards well established

**Research date:** 2026-02-02
**Valid until:** 2026-03-04 (30 days - stable ecosystem)

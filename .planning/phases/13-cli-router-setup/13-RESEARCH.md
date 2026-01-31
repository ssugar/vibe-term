# Phase 13: CLI Router & Setup Command - Research

**Researched:** 2026-01-31
**Domain:** CLI subcommand routing, interactive prompts, JSON hook configuration merging
**Confidence:** HIGH

## Summary

This research establishes the patterns for implementing a CLI router that dispatches between subcommands (`vibe-term setup`) and the default TUI (`vibe-term`), plus the setup command itself which installs global hooks to `~/.claude/settings.json`. The phase builds on Phase 12's foundation services (settingsService, vibeTermDirService, CLI output utilities).

The key finding is that **meow (already installed, v14.0.0) does not have built-in subcommand support**, but positional arguments are accessible via `cli.input[]`. The recommended pattern is a simple check: if `cli.input[0] === 'setup'`, run the setup command; otherwise, proceed to TUI initialization. This "command-or-TUI router" pattern is lightweight and avoids adding another dependency like Commander or Yargs.

For the confirmation prompt ("This will modify ~/.claude/settings.json. Continue? [Y/n]"), Node.js native `readline/promises` module provides a clean async/await API without external dependencies. The prompt uses `rl.question()` and defaults to Yes if the user presses Enter.

For hook merging, the approach is: read existing hooks, check each hook event type, and append vibe-term's hooks to the array for that event while preserving any existing hooks. Detection of "already installed" checks if any hook command contains `~/.vibe-term/status-hook.sh`.

**Primary recommendation:** Use meow's `cli.input[0]` for subcommand detection, `readline/promises` for confirmation, and array concatenation for intelligent hook merging.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| meow | 14.0.0 | CLI argument parsing | Already installed, lightweight, positional args via cli.input |
| readline/promises | built-in | Interactive prompts | Native Node.js, async/await, zero dependencies |
| fs/promises | built-in | File operations | Native Node.js, already used in settingsService |
| picocolors | 1.1.x | Terminal colors | Already installed (Phase 12), for setup output |
| figures | 6.1.0 | Status symbols | Already installed (Phase 12), for setup output |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| settingsService | local | Claude settings operations | Read/write/backup settings.json |
| vibeTermDirService | local | ~/.vibe-term/ management | Install hook script |
| cli/output | local | Colored CLI output | Success/error/warning messages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| meow + manual router | Commander.js | Commander has built-in subcommands but adds 101KB dependency |
| meow + manual router | Yargs | Yargs more powerful but overkill for 2 subcommands |
| readline/promises | inquirer | inquirer feature-rich but heavyweight for simple Y/n |
| readline/promises | @inquirer/prompts | Modern, but adds dependency for one prompt |

**Installation:**
```bash
# No new dependencies needed - all already installed or built-in
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli.tsx              # Entry point with command router
├── cli/
│   ├── output.ts        # CLI color/symbol utilities (Phase 12)
│   ├── setup.ts         # Setup command implementation
│   └── router.ts        # Command router (or inline in cli.tsx)
└── services/
    ├── settingsService.ts    # Claude settings operations (Phase 12)
    ├── vibeTermDirService.ts # Hook script installation (Phase 12)
    └── hookMerger.ts         # Hook configuration merging logic
```

### Pattern 1: Command-or-TUI Router
**What:** Check first positional argument to route between commands and TUI
**When to use:** CLI entry point
**Example:**
```typescript
// src/cli.tsx
import meow from 'meow';

const cli = meow(`
  Usage
    $ vibe-term           Launch TUI (default)
    $ vibe-term setup     Install global hooks

  Commands
    setup     Install hooks to ~/.claude/settings.json

  Options
    --refresh, -r  Refresh interval in seconds (default: 2)
    --yes          Skip confirmation prompts (setup only)
    --verbose, -v  Show detailed output (setup only)
`, {
  importMeta: import.meta,
  flags: {
    refresh: { type: 'number', shortFlag: 'r', default: 2 },
    yes: { type: 'boolean', default: false },
    verbose: { type: 'boolean', shortFlag: 'v', default: false },
  },
});

// Route based on first positional argument
const command = cli.input[0];

if (command === 'setup') {
  // Run setup command (separate from TUI initialization)
  const { runSetup } = await import('./cli/setup.js');
  const exitCode = await runSetup({
    yes: cli.flags.yes,
    verbose: cli.flags.verbose,
  });
  process.exit(exitCode);
}

// Default: proceed to TUI initialization
// ... existing TUI startup code ...
```

### Pattern 2: Confirmation Prompt with readline/promises
**What:** Async Y/n prompt that defaults to Yes on Enter
**When to use:** Before modifying settings.json (unless --yes flag)
**Example:**
```typescript
// src/cli/setup.ts
import { createInterface } from 'readline/promises';
import { stdin, stdout } from 'process';

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`${message} [Y/n] `);
    // Default to Yes on empty input (Enter key)
    return answer === '' || /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

// Usage:
if (!options.yes) {
  const proceed = await confirm('This will modify ~/.claude/settings.json. Continue?');
  if (!proceed) {
    console.log('Setup cancelled.');
    return 2; // User abort exit code
  }
}
```

### Pattern 3: Hook Merging Strategy
**What:** Append vibe-term hooks to existing hook arrays, preserving other tools' hooks
**When to use:** When installing hooks to settings.json
**Example:**
```typescript
// src/services/hookMerger.ts
import type { ClaudeSettings, HookConfig } from './settingsService.js';

const VIBE_TERM_HOOK_SCRIPT = '~/.vibe-term/status-hook.sh';

// All hook events vibe-term needs
const HOOK_EVENTS = [
  'SessionStart',
  'UserPromptSubmit',
  'PermissionRequest',
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'Stop',
  'SessionEnd',
  'SubagentStart',
  'SubagentStop',
  'Notification',
] as const;

/**
 * Check if vibe-term hooks are already installed
 */
export function isVibeTermInstalled(settings: ClaudeSettings): boolean {
  if (!settings.hooks) return false;

  // Check if any hook command contains our script path
  for (const event of HOOK_EVENTS) {
    const eventHooks = settings.hooks[event];
    if (!Array.isArray(eventHooks)) continue;

    for (const hookConfig of eventHooks) {
      if (!Array.isArray(hookConfig.hooks)) continue;
      for (const hook of hookConfig.hooks) {
        if (hook.command?.includes(VIBE_TERM_HOOK_SCRIPT)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Create a vibe-term hook configuration for an event
 */
function createHookConfig(event: string): HookConfig {
  const config: HookConfig = {
    hooks: [{
      type: 'command',
      command: VIBE_TERM_HOOK_SCRIPT,
    }],
  };

  // Add matcher for tool-related events
  if (['PreToolUse', 'PostToolUse', 'PostToolUseFailure'].includes(event)) {
    config.matcher = '*';
  }

  return config;
}

/**
 * Merge vibe-term hooks into existing settings
 */
export function mergeHooks(settings: ClaudeSettings): ClaudeSettings {
  const merged = { ...settings };
  merged.hooks = { ...(settings.hooks || {}) };

  for (const event of HOOK_EVENTS) {
    const existing = merged.hooks[event] || [];
    const vibeTermConfig = createHookConfig(event);

    // Append to existing array (preserve other tools' hooks)
    merged.hooks[event] = [...existing, vibeTermConfig];
  }

  return merged;
}
```

### Pattern 4: Version Comparison for Hook Script Updates
**What:** Simple semver comparison without external library
**When to use:** Checking if installed hook script needs updating
**Example:**
```typescript
// src/services/hookMerger.ts

/**
 * Extract version from hook script content
 * Script should have a comment like: # Version: 1.0.0
 */
export function extractScriptVersion(content: string): string | null {
  const match = content.match(/^#\s*Version:\s*(\d+\.\d+\.\d+)/m);
  return match ? match[1] : null;
}

/**
 * Compare two semver strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

/**
 * Check if hook script needs updating
 */
export async function needsScriptUpdate(installedContent: string | null, newContent: string): Promise<boolean> {
  if (!installedContent) return true; // Not installed

  const installedVersion = extractScriptVersion(installedContent);
  const newVersion = extractScriptVersion(newContent);

  // If either version is missing, assume update needed
  if (!installedVersion || !newVersion) return true;

  return compareVersions(newVersion, installedVersion) > 0;
}
```

### Pattern 5: Exit Codes
**What:** Consistent exit codes for setup command
**When to use:** Setup command completion
**Example:**
```typescript
// Exit codes per CONTEXT.md
export const EXIT_CODES = {
  SUCCESS: 0,      // Setup completed successfully
  ERROR: 1,        // Error occurred (settings not found, backup failed, etc.)
  USER_ABORT: 2,   // User cancelled at confirmation prompt
} as const;
```

### Anti-Patterns to Avoid
- **Using Ink for setup command output:** Ink is for TUI, use picocolors/console.log for CLI
- **Modifying settings without backup:** Always backup before changes per CONTEXT.md
- **Clobbering existing hooks:** Merge, don't replace; preserve other tools' hooks
- **Hardcoding hook script path:** Use VIBE_TERM_HOOK_SCRIPT constant, expandable later
- **Checking file content to detect installation:** Check for vibe-term's hook path in config
- **Synchronous readline:** Use readline/promises for async/await compatibility

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI argument parsing | Manual process.argv | meow (already installed) | Handles edge cases, help text |
| Y/n confirmation | Custom stdin reading | readline/promises | Proper terminal handling |
| JSON deep merge | Recursive custom merge | Spread + array concat | Hooks are arrays, simple concat works |
| Path expansion (~) | String replace | Keep ~ in config | Claude expands ~ at runtime |
| Color support detection | Check TERM env | picocolors auto-detect | Handles CI, Windows, etc. |

**Key insight:** For this phase, the complexity is in the hook merging logic, not the CLI framework. meow is sufficient for routing, and native readline handles prompts well.

## Common Pitfalls

### Pitfall 1: readline Not Closing
**What goes wrong:** Process hangs after prompt completes
**Why it happens:** readline keeps stdin open
**How to avoid:** Always call `rl.close()` in finally block
**Warning signs:** Process doesn't exit after setup completes

### Pitfall 2: ~ Path Expansion
**What goes wrong:** File not found when running hook script
**Why it happens:** Node.js doesn't expand ~ in paths
**How to avoid:** Keep ~ in settings.json (Claude expands it), use `homedir()` in Node.js code
**Warning signs:** ENOENT for ~/.vibe-term/status-hook.sh at runtime

### Pitfall 3: Settings File Doesn't Exist
**What goes wrong:** Setup fails on fresh Claude Code install
**Why it happens:** settings.json created on first Claude Code use
**How to avoid:** Check `settingsFileExists()` and show clear error message
**Warning signs:** ENOENT trying to read settings.json

### Pitfall 4: Hook Array vs Object Confusion
**What goes wrong:** Hooks don't fire
**Why it happens:** Claude hooks are arrays of HookConfig objects
**How to avoid:** Follow exact Claude hooks schema: `hooks[event] = [{ hooks: [{ type, command }] }]`
**Warning signs:** Hooks appear in settings.json but don't run

### Pitfall 5: Matcher Missing for Tool Events
**What goes wrong:** Tool hooks (PreToolUse, PostToolUse) don't fire
**Why it happens:** Tool events require matcher field
**How to avoid:** Add `matcher: '*'` for tool events
**Warning signs:** SessionStart works but PostToolUse doesn't

### Pitfall 6: TTY Check for Prompts
**What goes wrong:** Setup hangs in CI/piped input
**Why it happens:** readline.question waits forever without TTY
**How to avoid:** Skip prompt if `!process.stdin.isTTY` (treat as --yes)
**Warning signs:** CI build hangs at "Continue? [Y/n]"

## Code Examples

Verified patterns from official sources:

### Complete Setup Command
```typescript
// src/cli/setup.ts
import { createInterface } from 'readline/promises';
import { stdin, stdout } from 'process';
import * as output from './output.js';
import {
  readClaudeSettings,
  writeClaudeSettings,
  settingsFileExists,
  getSettingsPath,
} from '../services/settingsService.js';
import {
  installHookScript,
  readVibeTermFile,
  getVibeTermPath,
} from '../services/vibeTermDirService.js';
import {
  isVibeTermInstalled,
  mergeHooks,
  needsScriptUpdate,
  HOOK_SCRIPT_CONTENT,
} from '../services/hookMerger.js';

export const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  USER_ABORT: 2,
} as const;

interface SetupOptions {
  yes: boolean;
  verbose: boolean;
}

async function confirm(message: string): Promise<boolean> {
  // Skip prompt if not a TTY (CI, piped input)
  if (!stdin.isTTY) return true;

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`${message} [Y/n] `);
    return answer === '' || /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

export async function runSetup(options: SetupOptions): Promise<number> {
  const { yes, verbose } = options;

  // Step 1: Check settings.json exists
  if (!await settingsFileExists()) {
    output.error('Settings file not found. Run Claude Code first to create it.');
    output.info(`Expected: ${output.filePath(getSettingsPath())}`);
    return EXIT_CODES.ERROR;
  }

  // Step 2: Read current settings
  let settings;
  try {
    settings = await readClaudeSettings();
  } catch (error) {
    output.error(`Failed to read settings: ${(error as Error).message}`);
    return EXIT_CODES.ERROR;
  }

  // Step 3: Check if already installed
  if (isVibeTermInstalled(settings)) {
    output.success('Hooks already installed');

    // Check if script needs updating
    const installedScript = await readVibeTermFile('status-hook.sh');
    if (await needsScriptUpdate(installedScript, HOOK_SCRIPT_CONTENT)) {
      if (verbose) {
        output.info('Hook script update available');
      }
      await installHookScript();
      output.success(`Updated ${output.filePath(getVibeTermPath('status-hook.sh'))}`);
    }

    return EXIT_CODES.SUCCESS;
  }

  // Step 4: Show preview in verbose mode
  if (verbose) {
    output.heading('Changes to be made:');
    console.log(`  ${output.cyan('Modify')} ${output.filePath(getSettingsPath())}`);
    console.log(`  ${output.cyan('Create')} ${output.filePath(getVibeTermPath('status-hook.sh'))}`);
    console.log('');
  }

  // Step 5: Confirm (unless --yes)
  if (!yes) {
    const proceed = await confirm('This will modify ~/.claude/settings.json. Continue?');
    if (!proceed) {
      output.warning('Setup cancelled');
      return EXIT_CODES.USER_ABORT;
    }
  }

  // Step 6: Install hook script
  try {
    const scriptPath = await installHookScript();
    output.success(`Created ${output.filePath(scriptPath)}`);
  } catch (error) {
    output.error(`Failed to create hook script: ${(error as Error).message}`);
    return EXIT_CODES.ERROR;
  }

  // Step 7: Merge hooks and write settings
  try {
    const merged = mergeHooks(settings);
    const backupPath = await writeClaudeSettings(merged, { backup: true });

    if (backupPath) {
      output.success(`Backed up to ${output.filePath(backupPath)}`);
    }
    output.success(`Modified ${output.filePath(getSettingsPath())}`);
  } catch (error) {
    output.error(`Cannot create backup. Aborting to protect existing settings.`);
    if (verbose) {
      output.info(`Error: ${(error as Error).message}`);
    }
    return EXIT_CODES.ERROR;
  }

  // Step 8: Success message
  console.log('');
  output.success('vibe-term hooks installed successfully!');
  output.info('Next step: Run `vibe-term audit` to verify installation');

  return EXIT_CODES.SUCCESS;
}
```

### Claude Code Hooks JSON Structure
```typescript
// Source: https://code.claude.com/docs/en/hooks
// Claude settings.json hooks structure

interface ClaudeSettings {
  env?: Record<string, string>;
  hooks?: {
    [event: string]: HookConfig[];
  };
}

interface HookConfig {
  matcher?: string;  // Required for PreToolUse, PostToolUse, etc.
  hooks: Array<{
    type: 'command' | 'prompt' | 'agent';
    command?: string;  // For type: 'command'
    prompt?: string;   // For type: 'prompt' or 'agent'
    timeout?: number;
    async?: boolean;
  }>;
}

// Example vibe-term hooks configuration
const vibeTermHooksConfig = {
  hooks: {
    SessionStart: [{
      hooks: [{ type: 'command', command: '~/.vibe-term/status-hook.sh' }]
    }],
    UserPromptSubmit: [{
      hooks: [{ type: 'command', command: '~/.vibe-term/status-hook.sh' }]
    }],
    PreToolUse: [{
      matcher: '*',
      hooks: [{ type: 'command', command: '~/.vibe-term/status-hook.sh' }]
    }],
    PostToolUse: [{
      matcher: '*',
      hooks: [{ type: 'command', command: '~/.vibe-term/status-hook.sh' }]
    }],
    // ... other events
  }
};
```

### readline/promises Basic Usage
```typescript
// Source: https://nodejs.org/api/readline.html
import { createInterface } from 'readline/promises';
import { stdin, stdout } from 'process';

const rl = createInterface({
  input: stdin,
  output: stdout,
});

// question() returns a Promise<string>
const answer = await rl.question('What is your name? ');
console.log(`Hello, ${answer}!`);

// CRITICAL: Always close to prevent process hang
rl.close();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Commander/Yargs for all CLIs | meow for simple CLIs | 2020+ | Lighter for basic needs |
| readline callbacks | readline/promises | Node 17+ | async/await support |
| inquirer for prompts | readline/promises for simple | 2022+ | Zero dependencies |
| Object.assign for JSON merge | Spread operator | ES2018+ | Cleaner, immutable |

**Deprecated/outdated:**
- `readline` callback API: Still works but promises API preferred
- `inquirer@8.x`: CJS-only, use @inquirer/* packages for ESM
- `yargs@16.x`: Use yargs@17+ for ESM support

## Open Questions

Things that couldn't be fully resolved:

1. **Hook Script Versioning Scheme**
   - What we know: Need to detect if installed script is older than new version
   - What's unclear: Initial version number, how to embed in script
   - Recommendation: Use `# Version: 1.0.0` comment in script header, start at 1.0.0

2. **Existing Hook Chaining**
   - What we know: Some tools chain hooks by calling previous command
   - What's unclear: Whether vibe-term should chain or run alongside
   - Recommendation: Run alongside (array append), don't modify other hooks' commands

3. **--dry-run Flag**
   - What we know: CONTEXT.md doesn't mention dry-run
   - What's unclear: Whether preview-only mode is desired
   - Recommendation: Defer to future if needed; verbose mode shows preview already

## Sources

### Primary (HIGH confidence)
- [Node.js readline/promises documentation](https://nodejs.org/api/readline.html) - Promise API, question() method
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) - Complete hooks schema, all events, matcher patterns
- [meow GitHub](https://github.com/sindresorhus/meow) - cli.input for positional args, v14.0.0 API
- Phase 12 RESEARCH.md - settingsService, vibeTermDirService, cli/output patterns

### Secondary (MEDIUM confidence)
- [GeeksforGeeks version comparison](https://www.geeksforgeeks.org/dsa/compare-two-version-numbers/) - Simple semver comparison algorithm
- [npm-compare.com CLI libraries](https://npm-compare.com/commander,yargs) - Commander vs Yargs comparison
- [DeepWiki OpenAI Codex CLI patterns](https://deepwiki.com/openai/codex/4.3-cli-entry-points-and-dispatch) - Command-or-TUI router pattern

### Tertiary (LOW confidence)
- WebSearch results on hook chaining patterns - General shell patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed or built-in
- Architecture: HIGH - Based on existing project patterns and official docs
- Pitfalls: HIGH - Common Node.js/readline issues well documented

**Research date:** 2026-01-31
**Valid until:** 2026-03-02 (30 days - stable ecosystem, Node.js built-ins)

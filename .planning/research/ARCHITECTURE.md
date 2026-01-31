# Architecture Research: CLI Subcommand Integration

**Researched:** 2026-01-30
**Domain:** CLI architecture for hook management subcommands
**Confidence:** HIGH (existing codebase well understood, meow pattern clear)

## Research Question

How do CLI subcommands (setup/audit/fix) integrate with existing TUI architecture?

## Current Architecture Summary

The existing architecture has a single entry point (`src/cli.tsx`) that:

1. Parses flags with meow (`--refresh`)
2. Runs startup orchestration (`ensureTmuxEnvironment()`)
3. Loads config (`loadConfig()`)
4. Configures tmux session
5. Creates HUD layout
6. Renders Ink app

**Key characteristic:** The entire file assumes TUI launch. There is no branch point for "do something else."

```typescript
// Current cli.tsx flow (simplified)
const cli = meow({ flags: { refresh: {...} } });
const startupResult = ensureTmuxEnvironment();  // Always runs
const config = loadConfig();                     // Always loads TUI config
await configureSession(...);                     // Always configures tmux
const { unmount } = render(<App />);            // Always renders TUI
```

## Integration Approach

### Core Pattern: Command Router Before TUI Launch

Meow does not have native subcommand support. Handle via `cli.input[0]`:

```typescript
const cli = meow({ ... });
const command = cli.input[0]; // 'setup', 'audit', 'fix', or undefined

if (!command) {
  // No command = launch TUI (existing behavior)
  launchTUI();
} else {
  // Handle subcommand without TUI
  await handleCommand(command, cli);
  process.exit(0);
}
```

**Key insight:** Subcommands complete and exit. They never launch the TUI.

### Architecture Decision: Separate Entry Points

**Option A: Single cli.tsx with router**
- Pros: Single entry point, shared code
- Cons: cli.tsx becomes command router, mixes concerns

**Option B: Separate command files**
- Pros: Clean separation, each file does one thing
- Cons: More files, potential code duplication

**Recommendation: Option A with extracted handlers**

Keep `cli.tsx` as the router, but extract command logic to dedicated files:

```
src/
  cli.tsx              # Entry point, routes to command or TUI
  commands/
    setup.ts           # vibe-term setup
    audit.ts           # vibe-term audit
    fix.ts             # vibe-term fix [project]
```

This keeps the single binary entry point while organizing command logic cleanly.

## New Components Needed

### 1. Command Router (in cli.tsx)

**Purpose:** Route based on `cli.input[0]` before TUI initialization

**Location:** `src/cli.tsx` (modify existing)

**Interface:**
```typescript
// Added to cli.tsx, before ensureTmuxEnvironment()
const command = cli.input[0];

switch (command) {
  case 'setup':
    await runSetup(cli.flags);
    process.exit(0);
  case 'audit':
    await runAudit(cli.flags);
    process.exit(0);
  case 'fix':
    await runFix(cli.input[1], cli.flags);
    process.exit(0);
  case undefined:
    // Fall through to existing TUI launch
    break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
```

### 2. Setup Command Handler

**Purpose:** Install vibe-term hooks globally

**Location:** `src/commands/setup.ts`

**Responsibilities:**
- Create `~/.vibe-term/` directory
- Copy/install hooks script to `~/.vibe-term/hooks.js`
- Update `~/.claude/settings.json` with hook configuration
- Backup existing settings before modification

**Interface:**
```typescript
// src/commands/setup.ts
export interface SetupOptions {
  backup?: boolean;  // --backup flag
  force?: boolean;   // --force to overwrite existing
}

export async function runSetup(options: SetupOptions): Promise<void>;
```

**Output:** Console messages only (no TUI rendering)

### 3. Audit Command Handler

**Purpose:** Scan Claude projects for conflicting hook settings

**Location:** `src/commands/audit.ts`

**Responsibilities:**
- Read project list from `~/.claude/projects/`
- For each project, check `.claude/settings.json` for hook conflicts
- Report conflicts to stdout (table or list format)
- Exit with code 0 if clean, 1 if conflicts found

**Interface:**
```typescript
// src/commands/audit.ts
export interface AuditOptions {
  json?: boolean;    // --json for machine-readable output
  quiet?: boolean;   // --quiet for exit code only
}

export interface AuditResult {
  projectPath: string;
  hasConflict: boolean;
  existingHooks: string[];
  recommendation: string;
}

export async function runAudit(options: AuditOptions): Promise<AuditResult[]>;
```

### 4. Fix Command Handler

**Purpose:** Merge hooks for a specific project

**Location:** `src/commands/fix.ts`

**Responsibilities:**
- Accept project path as argument (optional, defaults to cwd)
- Read project's `.claude/settings.json`
- Backup existing settings
- Merge vibe-term hooks with existing hooks (preserve project hooks)
- Write updated settings

**Interface:**
```typescript
// src/commands/fix.ts
export interface FixOptions {
  backup?: boolean;  // --backup (default: true)
  dryRun?: boolean;  // --dry-run to preview changes
}

export async function runFix(
  projectPath: string | undefined,
  options: FixOptions
): Promise<void>;
```

### 5. Shared Services

**Location:** `src/services/` (new files)

**5a. projectDiscoveryService.ts**
```typescript
// Discover Claude projects from ~/.claude/projects/
export interface ClaudeProject {
  path: string;
  name: string;
  hasLocalSettings: boolean;
}

export function discoverProjects(): ClaudeProject[];
```

**5b. settingsService.ts**
```typescript
// Read/write Claude settings.json files
export interface ClaudeSettings {
  hooks?: {
    [hookName: string]: string | string[];
  };
  // ... other settings
}

export function readSettings(path: string): ClaudeSettings | null;
export function writeSettings(path: string, settings: ClaudeSettings): void;
export function backupSettings(path: string): string;  // Returns backup path
```

**5c. hookMergeService.ts**
```typescript
// Intelligent hook merging
export interface MergeResult {
  merged: ClaudeSettings;
  changes: string[];  // Human-readable change descriptions
}

export function mergeHooks(
  existing: ClaudeSettings,
  vibeTermHooks: ClaudeSettings
): MergeResult;
```

### 6. vibeTermDirService.ts

**Purpose:** Manage `~/.vibe-term/` directory

**Location:** `src/services/vibeTermDirService.ts`

**Responsibilities:**
- Create `~/.vibe-term/` if not exists
- Write hooks script to `~/.vibe-term/hooks.js`
- Read/write config from `~/.vibe-term/config.json`

**Interface:**
```typescript
export const VIBE_TERM_DIR = join(homedir(), '.vibe-term');
export const HOOKS_SCRIPT_PATH = join(VIBE_TERM_DIR, 'hooks.js');

export function ensureVibeTermDir(): void;
export function installHooksScript(): void;
export function getHooksScriptPath(): string;
```

## Modified Components

### cli.tsx

**Changes:**
- Add command router before `ensureTmuxEnvironment()`
- Update meow help text to include subcommands
- Import command handlers

**Before:**
```typescript
const cli = meow(`
  Usage
    $ vibe-term

  Options
    --refresh, -r  Refresh interval in seconds (default: 2)
`, { ... });

const startupResult = ensureTmuxEnvironment();
// ... rest of TUI launch
```

**After:**
```typescript
const cli = meow(`
  Usage
    $ vibe-term              Launch the HUD
    $ vibe-term setup        Install hooks globally
    $ vibe-term audit        Scan projects for conflicts
    $ vibe-term fix [path]   Merge hooks for a project

  Options
    --refresh, -r  Refresh interval in seconds (default: 2)
    --backup       Create backup before modifying settings (default: true)
    --json         Output in JSON format (audit command)
    --dry-run      Preview changes without applying (fix command)
`, { ... });

// Route to command handler
const command = cli.input[0];
if (command) {
  await handleCommand(command, cli);
  process.exit(0);
}

// No command = launch TUI (existing code unchanged)
const startupResult = ensureTmuxEnvironment();
// ... rest of TUI launch
```

### hookStateService.ts

**Current location:** `~/.claude-hud/sessions/`
**New location:** Consider moving to `~/.vibe-term/sessions/`

**Changes:**
- Update `STATE_DIR` constant
- Add migration logic if old directory exists

**Note:** This is optional for v3.0. Could be deferred to keep scope focused.

## Data Flow

### Setup Command Flow

```
User runs: vibe-term setup
    |
    v
cli.tsx: routes to runSetup()
    |
    v
vibeTermDirService.ensureVibeTermDir()
    |-- Creates ~/.vibe-term/ if not exists
    v
vibeTermDirService.installHooksScript()
    |-- Writes hooks.js to ~/.vibe-term/
    v
settingsService.readSettings('~/.claude/settings.json')
    |-- Reads existing global settings
    v
settingsService.backupSettings()
    |-- Creates settings.json.backup
    v
hookMergeService.mergeHooks()
    |-- Merges vibe-term hooks with existing
    v
settingsService.writeSettings()
    |-- Writes merged settings
    v
Console output: "Setup complete. Hooks installed."
```

### Audit Command Flow

```
User runs: vibe-term audit
    |
    v
cli.tsx: routes to runAudit()
    |
    v
projectDiscoveryService.discoverProjects()
    |-- Reads ~/.claude/projects/ directory
    |-- Returns list of project paths
    v
For each project:
    settingsService.readSettings(project/.claude/settings.json)
    |-- Check for hook conflicts
    |
    v
Aggregate results
    |
    v
Console output: Table of projects with conflict status
Exit code: 0 if clean, 1 if conflicts
```

### Fix Command Flow

```
User runs: vibe-term fix ~/my-project
    |
    v
cli.tsx: routes to runFix('~/my-project')
    |
    v
settingsService.readSettings(project/.claude/settings.json)
    |-- Reads project-local settings
    v
If --dry-run:
    hookMergeService.mergeHooks() -> display changes only
    Exit
    |
    v
settingsService.backupSettings()
    |-- Creates settings.json.backup
    v
hookMergeService.mergeHooks()
    |-- Merges preserving existing project hooks
    v
settingsService.writeSettings()
    |-- Writes merged settings
    v
Console output: "Fixed. Backup at: ..."
```

## Integration Points Summary

| Existing Component | Integration Type | Changes Needed |
|-------------------|------------------|----------------|
| `cli.tsx` | Extend | Add command router at top, update help text |
| `hookStateService.ts` | Optional modify | Move state dir (defer to v4) |
| `configService.ts` | Reuse pattern | New services follow same pattern |
| `directoryService.ts` | Reuse utilities | Use expandTilde, directoryExists |
| `platform.ts` | Reuse | Use execAsync for any shell commands |

| New Component | Purpose |
|--------------|---------|
| `src/commands/setup.ts` | Setup command handler |
| `src/commands/audit.ts` | Audit command handler |
| `src/commands/fix.ts` | Fix command handler |
| `src/services/projectDiscoveryService.ts` | Find Claude projects |
| `src/services/settingsService.ts` | Read/write Claude settings |
| `src/services/hookMergeService.ts` | Intelligent hook merging |
| `src/services/vibeTermDirService.ts` | Manage ~/.vibe-term/ |

## Build Order Recommendation

Based on dependencies, recommended implementation sequence:

### Phase 1: Foundation Services

**Tickets 1-2:** Directory and settings infrastructure

1. **vibeTermDirService** - Create ~/.vibe-term/, install hooks script
2. **settingsService** - Read/write/backup Claude settings files

These are dependencies for all commands.

### Phase 2: Setup Command

**Ticket 3:** Setup command (highest user value, enables hook installation)

- Implement `src/commands/setup.ts`
- Add command routing to `cli.tsx`
- Test: `vibe-term setup` installs hooks globally

### Phase 3: Audit Command

**Ticket 4:** Audit command (enables conflict detection)

- Implement `projectDiscoveryService`
- Implement `src/commands/audit.ts`
- Test: `vibe-term audit` lists projects with conflict status

### Phase 4: Fix Command

**Ticket 5:** Fix command (completes the hook management story)

- Implement `hookMergeService`
- Implement `src/commands/fix.ts`
- Test: `vibe-term fix ~/project` merges hooks with backup

### Phase 5: npm Distribution

**Ticket 6:** Package for npm global install

- Update package.json for npm publish
- Test bin entry point works after `npm install -g`
- Create release workflow

## Architecture Patterns

### Pattern 1: Command-or-TUI Router

**What:** Check for subcommand before any TUI initialization

**Why:**
- Subcommands are fast, stateless operations
- They should not require tmux, Ink, or any TUI infrastructure
- Clean separation of concerns

**How:**
```typescript
const command = cli.input[0];
if (command) {
  // Handle synchronously or with minimal async
  await handleCommand(command);
  process.exit(0);  // Always exit, never continue to TUI
}
// Existing TUI launch code unchanged
```

### Pattern 2: Service Layer for File Operations

**What:** All file operations go through service functions

**Why:**
- Consistent error handling
- Easier testing
- Matches existing codebase pattern (configService, hookStateService)

**How:**
```typescript
// Bad: Direct fs calls in command handlers
const content = readFileSync(settingsPath, 'utf-8');

// Good: Service abstraction
const settings = settingsService.readSettings(settingsPath);
```

### Pattern 3: Backup Before Modify

**What:** Always create backup before modifying user files

**Why:**
- User trust (can always recover)
- Safety for automated operations
- Matches user expectations for CLI tools

**How:**
```typescript
// In settingsService
export function backupSettings(path: string): string {
  const backupPath = `${path}.backup.${Date.now()}`;
  copyFileSync(path, backupPath);
  return backupPath;
}
```

### Pattern 4: Console Output for CLI Commands

**What:** Use console.log/console.error, not Ink components

**Why:**
- Subcommands don't render TUI
- Simple, fast output
- Works in pipes (`vibe-term audit | grep conflict`)
- Matches standard CLI conventions

**How:**
```typescript
// In command handlers
console.log('Setup complete.');
console.error('Error: Could not read settings file.');

// For structured output
if (options.json) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(formatTable(results));
}
```

## Anti-Patterns to Avoid

1. **Importing TUI code in commands:** Commands should not import Ink, React, or store code. Keep them independent.

2. **Async TUI initialization for commands:** Don't let command handlers wait on tmux setup or config loading they don't need.

3. **Shared state between command and TUI:** Commands are one-shot operations. Don't try to share Zustand store or similar.

4. **Modifying settings without backup:** Always backup. Always.

## Open Questions

### 1. Hook Script Location

**Question:** Should hooks.js be bundled in the npm package or generated at setup time?

**Options:**
- A) Bundle in package, copy to ~/.vibe-term/ at setup
- B) Generate from template at setup time
- C) Reference directly from npm install location

**Recommendation:** Option A. Bundle and copy.
- Predictable location (`~/.vibe-term/hooks.js`)
- Works regardless of npm install path (global vs local)
- Easy to update (re-run setup)

### 2. Settings Merge Strategy

**Question:** When merging hooks, how to handle existing hooks?

**Options:**
- A) Overwrite: Replace all hooks with vibe-term's
- B) Append: Add vibe-term hooks to existing array
- C) Prepend: Add vibe-term hooks before existing
- D) Smart merge: Detect if vibe-term hook already present

**Recommendation:** Option D. Smart merge.
- Don't duplicate if already present
- Preserve order of existing hooks
- Add vibe-term hooks at end if missing

### 3. Error Handling Strategy

**Question:** How verbose should error messages be?

**Recommendation:** Verbose with actionable guidance.
```
Error: Cannot read ~/.claude/settings.json
  Permission denied

To fix:
  chmod 644 ~/.claude/settings.json
  vibe-term setup
```

## Sources

- [meow GitHub](https://github.com/sindresorhus/meow) - CLI parser documentation, input array handling
- [meow npm](https://www.npmjs.com/package/meow) - API reference
- Existing codebase: `src/cli.tsx`, `src/services/configService.ts`, `src/services/directoryService.ts`
- PROJECT.md v3.0 requirements

---

**Confidence Assessment:**

| Area | Confidence | Reason |
|------|------------|--------|
| Command routing pattern | HIGH | Standard meow pattern, simple implementation |
| File structure | HIGH | Matches existing codebase conventions |
| Settings merge logic | MEDIUM | Need to verify Claude settings.json structure |
| npm distribution | MEDIUM | Standard npm publish, but needs testing |

**Research date:** 2026-01-30

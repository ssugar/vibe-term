# Phase 12: Foundation Services - Research

**Researched:** 2026-01-30
**Domain:** Node.js file system operations, CLI output utilities, JSON settings management
**Confidence:** HIGH

## Summary

This research establishes the standard patterns for building foundation services that support CLI commands in an ESM TypeScript project. The phase focuses on three core areas: (1) ~/.vibe-term/ directory management for storing hook scripts, (2) Claude settings.json file operations with backup support, and (3) colored CLI output utilities with status symbols.

The key finding is that the project already uses `figures` (v6.1.0) for symbols and Ink for TUI colors, but CLI subcommands (setup, audit, fix) need **non-Ink colored output** since they run before/instead of the TUI. The recommended approach is to add `picocolors` - a 7KB zero-dependency library that's the fastest and smallest option for terminal colors, with full ESM support. Combined with the existing `figures` package, this provides complete CLI output capabilities.

For file operations, Node.js built-in `fs` module with async/promises API is sufficient - no external libraries needed. Atomic writes are achieved with the temp-file-then-rename pattern already used in the project's status-hook.sh.

**Primary recommendation:** Use `picocolors` for CLI colors, `figures` (already installed) for symbols, and Node.js `fs/promises` for all file operations. Create reusable `cliOutput` utilities that combine colors and symbols for consistent CLI feedback.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| picocolors | 1.1.x | Terminal colors | 7KB, zero deps, fastest, pure ESM support |
| figures | 6.1.0 | Status symbols | Already installed, cross-platform Unicode with fallbacks |
| fs/promises | built-in | File operations | Native Node.js, async/await, no dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| log-symbols | 7.x | Colored symbols | Pre-colored success/error/warning/info (optional - can build with picocolors+figures) |
| write-file-atomic | 6.x | Atomic writes | Only if temp-rename pattern insufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| picocolors | chalk 5.x | Chalk larger (101KB vs 7KB), more features not needed |
| picocolors | ansis | ansis faster for multiple styles, but overkill for simple CLI |
| fs/promises | fs-extra | fs-extra adds conveniences, but native fs sufficient |
| manual atomic | write-file-atomic | Library handles edge cases, but temp-rename works |

**Installation:**
```bash
npm install picocolors
# figures already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli.tsx              # Entry point (existing)
├── services/
│   ├── vibeTermDirService.ts    # ~/.vibe-term/ directory management
│   ├── settingsService.ts       # Claude settings.json read/write/backup
│   └── ...existing services...
└── cli/
    ├── output.ts                # CLI color/symbol utilities
    └── ...future commands...
```

### Pattern 1: CLI Output Utilities
**What:** Centralized functions for colored CLI output with symbols
**When to use:** All CLI command output (setup, audit, fix)
**Example:**
```typescript
// src/cli/output.ts
import pc from 'picocolors';
import figures from 'figures';

export const cli = {
  // Status messages
  success: (msg: string) => console.log(`${pc.green(figures.tick)} ${msg}`),
  error: (msg: string) => console.log(`${pc.red(figures.cross)} ${msg}`),
  warning: (msg: string) => console.log(`${pc.yellow(figures.warning)} ${msg}`),
  info: (msg: string) => console.log(`${pc.blue(figures.info)} ${msg}`),

  // Styled text (return strings for composition)
  green: (s: string) => pc.green(s),
  red: (s: string) => pc.red(s),
  yellow: (s: string) => pc.yellow(s),
  dim: (s: string) => pc.dim(s),
  bold: (s: string) => pc.bold(s),

  // Combined
  path: (p: string) => pc.cyan(p),
  code: (c: string) => pc.dim(c),
};

// Usage:
// cli.success('Hooks installed successfully');
// cli.error(`Failed to read ${cli.path(filePath)}`);
// console.log(`Created ${cli.green('backup')} at ${cli.path(backupPath)}`);
```

### Pattern 2: Directory Service with Idempotent Creation
**What:** Service to manage ~/.vibe-term/ directory and its contents
**When to use:** Setup command, any operation needing vibe-term directory
**Example:**
```typescript
// src/services/vibeTermDirService.ts
import { mkdir, writeFile, readFile, access, constants } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const VIBE_TERM_DIR = join(homedir(), '.vibe-term');

export async function ensureVibeTermDir(): Promise<void> {
  await mkdir(VIBE_TERM_DIR, { recursive: true });
}

export async function getVibeTermPath(filename: string): Promise<string> {
  return join(VIBE_TERM_DIR, filename);
}

export async function writeVibeTermFile(filename: string, content: string): Promise<void> {
  await ensureVibeTermDir();
  const filePath = join(VIBE_TERM_DIR, filename);
  await writeFile(filePath, content, 'utf-8');
}

export async function vibeTermFileExists(filename: string): Promise<boolean> {
  try {
    await access(join(VIBE_TERM_DIR, filename), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
```

### Pattern 3: Settings Service with Backup
**What:** Read/write Claude settings.json with automatic backup
**When to use:** Setup command, fix command
**Example:**
```typescript
// src/services/settingsService.ts
import { readFile, writeFile, copyFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const CLAUDE_SETTINGS = join(homedir(), '.claude', 'settings.json');

export interface ClaudeSettings {
  env?: Record<string, string>;
  hooks?: Record<string, unknown[]>;
  [key: string]: unknown;
}

export async function readClaudeSettings(): Promise<ClaudeSettings> {
  try {
    const content = await readFile(CLAUDE_SETTINGS, 'utf-8');
    return JSON.parse(content) as ClaudeSettings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {}; // No settings file yet
    }
    throw error;
  }
}

export async function writeClaudeSettings(
  settings: ClaudeSettings,
  createBackup = true
): Promise<string | null> {
  let backupPath: string | null = null;

  if (createBackup) {
    backupPath = await backupClaudeSettings();
  }

  const content = JSON.stringify(settings, null, 2);
  await writeFile(CLAUDE_SETTINGS, content, 'utf-8');

  return backupPath;
}

export async function backupClaudeSettings(): Promise<string> {
  const timestamp = formatBackupTimestamp(new Date());
  const backupPath = `${CLAUDE_SETTINGS}.vibe-term-backup.${timestamp}`;
  await copyFile(CLAUDE_SETTINGS, backupPath);
  return backupPath;
}

function formatBackupTimestamp(date: Date): string {
  // Format: YYYY-MM-DD_HHmmss (human readable, filesystem safe)
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}
```

### Pattern 4: Atomic File Writes (when needed)
**What:** Write to temp file, then rename for atomicity
**When to use:** Critical files where partial writes are dangerous
**Example:**
```typescript
import { writeFile, rename, unlink } from 'fs/promises';

async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp.${process.pid}`;
  try {
    await writeFile(tempPath, content, 'utf-8');
    await rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on failure
    try { await unlink(tempPath); } catch { /* ignore */ }
    throw error;
  }
}
```

### Pattern 5: Error Handling with Typed Errors
**What:** Custom error types for service operations
**When to use:** When callers need to handle specific error conditions
**Example:**
```typescript
export class SettingsError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'PARSE_ERROR' | 'WRITE_ERROR' | 'BACKUP_ERROR',
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SettingsError';
  }
}

export async function readClaudeSettings(): Promise<ClaudeSettings> {
  try {
    const content = await readFile(CLAUDE_SETTINGS, 'utf-8');
    try {
      return JSON.parse(content) as ClaudeSettings;
    } catch (parseError) {
      throw new SettingsError(
        `Invalid JSON in ${CLAUDE_SETTINGS}`,
        'PARSE_ERROR',
        parseError as Error
      );
    }
  } catch (error) {
    if (error instanceof SettingsError) throw error;
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {}; // No settings file is OK
    }
    throw new SettingsError(
      `Failed to read ${CLAUDE_SETTINGS}`,
      'NOT_FOUND',
      error as Error
    );
  }
}
```

### Anti-Patterns to Avoid
- **Using Ink components for CLI output:** Ink is for TUI, use picocolors for pre-TUI CLI
- **Sync fs operations:** Use async fs/promises for non-blocking I/O
- **Hardcoding paths:** Use `homedir()` and `join()` for cross-platform paths
- **Silent error swallowing:** Always handle errors explicitly, log or rethrow
- **Multiple backup formats:** Stick to one timestamp format for consistency
- **Mixing console.log and Ink:** Choose one per command execution context

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Terminal colors | ANSI escape codes | picocolors | Color support detection, cross-platform |
| Cross-platform symbols | Hardcoded Unicode | figures | Windows CMD fallbacks |
| Recursive mkdir | Manual path traversal | `mkdir({ recursive: true })` | Built into Node.js |
| JSON stringify | Custom formatting | `JSON.stringify(x, null, 2)` | Handles edge cases |
| File existence check | try/catch with readFile | `access()` with constants | Semantic, doesn't read content |
| Path joining | String concatenation | `path.join()` | Cross-platform separators |

**Key insight:** Node.js built-in modules handle file operations well. The main value-add from external packages is terminal output (picocolors) and cross-platform symbols (figures), both tiny and well-maintained.

## Common Pitfalls

### Pitfall 1: fs/promises Import Path
**What goes wrong:** `from 'fs'` doesn't give promises API by default
**Why it happens:** Node.js fs module has callback API by default
**How to avoid:** Import from `'fs/promises'` for async/await support
**Warning signs:** Methods return undefined instead of promises

### Pitfall 2: JSON.parse on Invalid Input
**What goes wrong:** Uncaught exception crashes CLI
**Why it happens:** Malformed settings.json or empty file
**How to avoid:** Wrap JSON.parse in try/catch, return sensible default
**Warning signs:** "Unexpected token" errors in production

### Pitfall 3: Backup Before File Exists
**What goes wrong:** copyFile fails because source doesn't exist
**Why it happens:** Running setup on fresh install (no settings.json yet)
**How to avoid:** Check file exists before backup attempt
**Warning signs:** ENOENT errors during first-time setup

### Pitfall 4: Color Support in CI
**What goes wrong:** ANSI codes appear as garbage in CI logs
**Why it happens:** CI environments often don't support colors
**How to avoid:** picocolors auto-detects; can also check `pc.isColorSupported`
**Warning signs:** Escape sequences visible in output

### Pitfall 5: Timestamp in Filename - Colons
**What goes wrong:** Backup file creation fails on Windows
**Why it happens:** Windows doesn't allow `:` in filenames
**How to avoid:** Use underscore or no separator for time: `_HHmmss` not `:HH:mm:ss`
**Warning signs:** EINVAL or ENOENT on Windows

### Pitfall 6: ESM Extension in Imports
**What goes wrong:** Module not found at runtime
**Why it happens:** ESM requires explicit `.js` extension in imports
**How to avoid:** Use `.js` extension even for `.ts` source files
**Warning signs:** ERR_MODULE_NOT_FOUND

## Code Examples

Verified patterns from official sources:

### Complete CLI Output Module
```typescript
// src/cli/output.ts
// Source: picocolors GitHub, figures npm
import pc from 'picocolors';
import figures from 'figures';

// Symbol + color combinations for status messages
export function success(message: string): void {
  console.log(`${pc.green(figures.tick)} ${message}`);
}

export function error(message: string): void {
  console.log(`${pc.red(figures.cross)} ${message}`);
}

export function warning(message: string): void {
  console.log(`${pc.yellow(figures.warning)} ${message}`);
}

export function info(message: string): void {
  console.log(`${pc.blue(figures.info)} ${message}`);
}

// Text styling helpers (return strings for composition)
export const green = pc.green;
export const red = pc.red;
export const yellow = pc.yellow;
export const cyan = pc.cyan;
export const dim = pc.dim;
export const bold = pc.bold;

// Semantic helpers
export function filePath(p: string): string {
  return pc.cyan(p);
}

export function timestamp(t: string): string {
  return pc.dim(t);
}

// Formatted output
export function keyValue(key: string, value: string): void {
  console.log(`  ${pc.dim(key + ':')} ${value}`);
}

export function heading(text: string): void {
  console.log(`\n${pc.bold(text)}`);
}
```

### Complete Settings Service
```typescript
// src/services/settingsService.ts
// Source: Node.js fs/promises docs
import { readFile, writeFile, copyFile, access, constants } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const CLAUDE_DIR = join(homedir(), '.claude');
const CLAUDE_SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json');

export interface ClaudeSettings {
  env?: Record<string, string>;
  attribution?: Record<string, string>;
  hooks?: Record<string, HookConfig[]>;
  [key: string]: unknown;
}

export interface HookConfig {
  matcher?: string;
  hooks: Array<{
    type: string;
    command: string;
  }>;
}

/**
 * Read Claude settings.json, returning empty object if not found
 */
export async function readClaudeSettings(): Promise<ClaudeSettings> {
  try {
    const content = await readFile(CLAUDE_SETTINGS_PATH, 'utf-8');
    return JSON.parse(content) as ClaudeSettings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw new Error(`Failed to read settings: ${(error as Error).message}`);
  }
}

/**
 * Write Claude settings.json with optional backup
 * @returns Backup file path if backup was created, null otherwise
 */
export async function writeClaudeSettings(
  settings: ClaudeSettings,
  options: { backup?: boolean } = { backup: true }
): Promise<string | null> {
  let backupPath: string | null = null;

  // Create backup if requested and file exists
  if (options.backup) {
    const exists = await settingsFileExists();
    if (exists) {
      backupPath = await backupSettings();
    }
  }

  const content = JSON.stringify(settings, null, 2);
  await writeFile(CLAUDE_SETTINGS_PATH, content, 'utf-8');

  return backupPath;
}

/**
 * Create a backup of settings.json with human-readable timestamp
 * @returns Path to the backup file
 */
export async function backupSettings(): Promise<string> {
  const timestamp = formatTimestamp(new Date());
  const backupPath = `${CLAUDE_SETTINGS_PATH}.vibe-term-backup.${timestamp}`;
  await copyFile(CLAUDE_SETTINGS_PATH, backupPath);
  return backupPath;
}

/**
 * Check if settings.json exists
 */
export async function settingsFileExists(): Promise<boolean> {
  try {
    await access(CLAUDE_SETTINGS_PATH, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get path to Claude settings.json
 */
export function getSettingsPath(): string {
  return CLAUDE_SETTINGS_PATH;
}

/**
 * Format timestamp for backup filename
 * Format: YYYY-MM-DD_HHmmss (human readable, filesystem safe on all platforms)
 */
function formatTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
}
```

### Complete VibeTerm Directory Service
```typescript
// src/services/vibeTermDirService.ts
// Source: Node.js fs/promises docs
import { mkdir, writeFile, readFile, access, constants, chmod } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const VIBE_TERM_DIR = join(homedir(), '.vibe-term');

/**
 * Ensure ~/.vibe-term/ directory exists
 */
export async function ensureVibeTermDir(): Promise<void> {
  await mkdir(VIBE_TERM_DIR, { recursive: true });
}

/**
 * Get full path to a file in ~/.vibe-term/
 */
export function getVibeTermPath(filename: string): string {
  return join(VIBE_TERM_DIR, filename);
}

/**
 * Get the ~/.vibe-term/ directory path
 */
export function getVibeTermDir(): string {
  return VIBE_TERM_DIR;
}

/**
 * Write a file to ~/.vibe-term/, creating directory if needed
 */
export async function writeVibeTermFile(
  filename: string,
  content: string,
  options?: { executable?: boolean }
): Promise<string> {
  await ensureVibeTermDir();
  const filePath = getVibeTermPath(filename);
  await writeFile(filePath, content, 'utf-8');

  if (options?.executable) {
    await chmod(filePath, 0o755);
  }

  return filePath;
}

/**
 * Read a file from ~/.vibe-term/
 */
export async function readVibeTermFile(filename: string): Promise<string | null> {
  try {
    const filePath = getVibeTermPath(filename);
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Check if a file exists in ~/.vibe-term/
 */
export async function vibeTermFileExists(filename: string): Promise<boolean> {
  try {
    await access(getVibeTermPath(filename), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chalk for colors | picocolors (or ansis) | 2024+ | Smaller, faster |
| fs callbacks | fs/promises | Node 14+ | async/await support |
| require('fs') | import from 'fs/promises' | ESM adoption | Native ESM |
| moment.js for dates | Native Date API | 2022+ | No dependency needed for simple formatting |
| jsonfile package | Native JSON.parse/stringify | Always | No dependency needed |

**Deprecated/outdated:**
- `colors` package: Was compromised in Jan 2022, avoid
- `chalk@4.x`: CJS-only, use chalk@5+ for ESM or switch to picocolors
- `fs.existsSync`: Still works but `access()` is preferred semantic

## Open Questions

Things that couldn't be fully resolved:

1. **Hook Script Content**
   - What we know: Script needs to be installed to ~/.vibe-term/
   - What's unclear: Exact script content (copy from src/hooks/status-hook.sh or generate?)
   - Recommendation: Copy existing status-hook.sh content, embed as template string in code

2. **Existing Backup Cleanup**
   - What we know: Multiple backups will accumulate
   - What's unclear: Should old backups be cleaned up? How many to keep?
   - Recommendation: Don't auto-cleanup, users manage backups manually (per REQUIREMENTS out-of-scope)

3. **Project Settings Path Discovery**
   - What we know: Project settings at ~/.claude/projects/[encoded-path]/settings.json
   - What's unclear: Path encoding scheme (URL encoding? base64?)
   - Recommendation: Research in Phase 14 (Audit) when actually needed

## Sources

### Primary (HIGH confidence)
- [picocolors GitHub](https://github.com/alexeyraspopov/picocolors) - API, ESM usage
- [figures npm](https://www.npmjs.com/package/figures) - Symbol list, already in project
- [Node.js fs documentation](https://nodejs.org/api/fs.html) - fs/promises API
- Existing project code (hookStateService.ts, configService.ts) - Established patterns

### Secondary (MEDIUM confidence)
- [DEV.to Node.js color libraries comparison](https://dev.to/webdiscus/comparison-of-nodejs-libraries-to-colorize-text-in-terminal-4j3a) - Benchmark data
- [LogRocket JSON files guide](https://blog.logrocket.com/reading-writing-json-files-node-js-complete-tutorial/) - Best practices
- [UConn file naming guide](https://guides.lib.uconn.edu/c.php?g=832372&p=8226285) - Timestamp formats

### Tertiary (LOW confidence)
- WebSearch results on atomic file writes - General patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - picocolors verified via GitHub, figures already in project
- Architecture: HIGH - Based on existing project patterns and Node.js docs
- Pitfalls: HIGH - Common Node.js/ESM issues well documented

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (30 days - stable ecosystem, Node.js built-ins)

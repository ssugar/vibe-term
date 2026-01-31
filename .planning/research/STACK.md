# v3.0 Stack Additions: npm Packaging & CLI Commands

**Researched:** 2026-01-30
**Scope:** Stack additions for npm global install and CLI hook management
**Confidence:** HIGH (verified via npm registry, GitHub, official docs)

## Executive Summary

The v3.0 milestone requires **minimal new dependencies**. The existing stack already provides most capabilities needed. Key decisions:

1. **Keep meow** - Add subcommand handling via `cli.input[0]` pattern (simpler than migrating to Commander)
2. **No glob library** - Use existing `fs.readdirSync` pattern (already in directoryService.ts)
3. **No atomic write library** - Use `fs.copyFileSync` for backup + `fs.writeFileSync` (sufficient for JSON config files)
4. **Package.json additions** - `files`, `prepublishOnly`, proper bin configuration (already present)

---

## New Dependencies

### None Required

| Considered | Decision | Rationale |
|------------|----------|-----------|
| commander | NOT ADDING | Meow already installed; subcommands achievable via `cli.input[0]` pattern |
| yargs | NOT ADDING | Same rationale as commander; overkill for 3 subcommands |
| glob / fast-glob | NOT ADDING | `fs.readdirSync` already used in directoryService.ts; no glob patterns needed |
| write-file-atomic | NOT ADDING | `fs.copyFileSync` + `fs.writeFileSync` sufficient for JSON with backup |
| globby | NOT ADDING | Would require Node.js 22+ for native fs.glob; project targets Node.js 20+ |

---

## Existing Stack (Validated for v3.0)

These capabilities are already present and sufficient:

| Capability | Current Implementation | v3.0 Usage |
|------------|----------------------|------------|
| CLI argument parsing | meow 14.0.0 | Add subcommand detection via `cli.input[0]` |
| File system operations | Node.js fs (readFileSync, writeFileSync, existsSync, etc.) | JSON read/write with backup |
| Directory scanning | fs.readdirSync in directoryService.ts | Scan ~/.claude/projects/ |
| Path expansion | os.homedir(), expandTilde() in directoryService.ts | Handle ~ paths |
| Directory creation | fs.mkdirSync with recursive:true | Create ~/.vibe-term/ |
| JSON parsing | Built-in JSON.parse/stringify | Settings file manipulation |

---

## CLI Subcommand Pattern with Meow

Meow doesn't have native subcommand support, but the pattern is simple:

```typescript
// cli.tsx - subcommand detection pattern
const cli = meow(`
  Usage
    $ vibe-term              Start HUD (default)
    $ vibe-term setup        Install global hooks
    $ vibe-term audit        Check for hook conflicts
    $ vibe-term fix          Fix conflicting hooks

  Options
    --refresh, -r    Refresh interval in seconds (default: 2)
    --dry-run        Show what would be changed without making changes
    --force          Overwrite existing hooks without prompting
`, {
  importMeta: import.meta,
  flags: {
    refresh: { type: 'number', shortFlag: 'r', default: 2 },
    dryRun: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
});

// Subcommand routing
const [subcommand] = cli.input;

switch (subcommand) {
  case 'setup':
    await runSetup(cli.flags);
    break;
  case 'audit':
    await runAudit(cli.flags);
    break;
  case 'fix':
    await runFix(cli.flags);
    break;
  case undefined:
    // Default: run HUD
    await runHud(cli.flags);
    break;
  default:
    console.error(`Unknown command: ${subcommand}`);
    cli.showHelp();
    process.exit(1);
}
```

**Why not switch to Commander?**
- Meow already installed (zero migration effort)
- Only 3 subcommands needed
- Pattern above is idiomatic and maintainable
- Commander would require replacing all existing flag handling

---

## JSON File Operations Pattern

For ~/.claude/settings.json and project-level settings:

```typescript
// services/settingsService.ts pattern
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

interface ClaudeSettings {
  hooks?: {
    preToolExecution?: string;
    postToolExecution?: string;
    // ... other hook types
  };
  // ... other settings
}

/**
 * Read Claude settings file with error handling
 */
export function readSettings(path: string): ClaudeSettings | null {
  try {
    if (!existsSync(path)) return null;
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as ClaudeSettings;
  } catch {
    return null;
  }
}

/**
 * Write settings with backup
 */
export function writeSettingsWithBackup(
  path: string,
  settings: ClaudeSettings,
  dryRun = false
): { backupPath: string | null; success: boolean } {
  const backupPath = `${path}.backup-${Date.now()}`;

  if (dryRun) {
    console.log(`Would backup ${path} to ${backupPath}`);
    console.log(`Would write settings to ${path}`);
    return { backupPath: null, success: true };
  }

  try {
    // Ensure directory exists
    mkdirSync(dirname(path), { recursive: true });

    // Create backup if file exists
    if (existsSync(path)) {
      copyFileSync(path, backupPath);
    }

    // Write new settings with pretty formatting
    writeFileSync(path, JSON.stringify(settings, null, 2) + '\n', 'utf-8');

    return { backupPath: existsSync(backupPath) ? backupPath : null, success: true };
  } catch (error) {
    console.error(`Failed to write settings: ${error}`);
    return { backupPath: null, success: false };
  }
}
```

**Why not write-file-atomic?**
- Settings files are small JSON (< 10KB typically)
- Concurrent writes not expected (CLI commands are user-initiated, one at a time)
- Backup via copyFileSync provides recovery path
- One less dependency to maintain

---

## Directory Scanning Pattern

For discovering projects in ~/.claude/projects/:

```typescript
// services/projectDiscoveryService.ts pattern
import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface DiscoveredProject {
  name: string;           // Directory name (project identifier)
  path: string;           // Full path to project directory in ~/.claude/projects/
  hasSettings: boolean;   // Whether .claude/settings.json exists in project
  settingsPath: string;   // Path to project's settings.json
}

/**
 * Discover all Claude projects from ~/.claude/projects/
 *
 * The ~/.claude/projects/ directory contains subdirectories named after
 * projects, each potentially containing its own settings.
 */
export function discoverProjects(): DiscoveredProject[] {
  const projectsDir = join(homedir(), '.claude', 'projects');

  if (!existsSync(projectsDir)) {
    return [];
  }

  try {
    const entries = readdirSync(projectsDir, { withFileTypes: true });

    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => {
        const projectPath = join(projectsDir, entry.name);
        const settingsPath = join(projectPath, 'settings.json');

        return {
          name: entry.name,
          path: projectPath,
          hasSettings: existsSync(settingsPath),
          settingsPath,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
```

**Why not glob/fast-glob?**
- No wildcard pattern matching needed
- Single directory level to scan
- `readdirSync` with `withFileTypes` is efficient
- Pattern already established in directoryService.ts

---

## npm Global Install Configuration

The existing package.json already has correct bin configuration. Additions needed:

```json
{
  "name": "vibe-term",
  "version": "3.0.0",
  "bin": {
    "vibe-term": "dist/cli.js"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsup src/cli.tsx --format esm --dts",
    "prepublishOnly": "npm run build"
  },
  "engines": {
    "node": ">=20"
  },
  "type": "module"
}
```

### Key npm packaging requirements:

| Field | Current | Required | Action |
|-------|---------|----------|--------|
| `bin` | `"dist/cli.js"` | Same | No change |
| `files` | Not present | `["dist", "README.md"]` | Add to limit published files |
| `prepublishOnly` | Not present | `"npm run build"` | Add to ensure build before publish |
| `engines.node` | `">=20"` | Same | No change |
| `type` | `"module"` | Same | No change |
| `main` | `"dist/cli.js"` | Same | No change |

### Testing before publish:

```bash
# Build the package
npm run build

# Test local global install
npm link

# Verify CLI works globally
vibe-term --help
vibe-term setup --dry-run

# Test the tarball contents
npm pack --dry-run

# Unlink when done testing
npm unlink -g vibe-term
```

---

## ~/.vibe-term/ Directory Structure

New persistent directory for vibe-term's own files:

```
~/.vibe-term/
  hooks/
    status-hook.sh      # Copied from package, made executable
  config.json           # Future: user preferences (currently in ~/.config/vibe-term/)
```

**Creation pattern:**

```typescript
import { mkdirSync, copyFileSync, chmodSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function ensureVibeTermDir(): string {
  const vibeTermDir = join(homedir(), '.vibe-term');
  const hooksDir = join(vibeTermDir, 'hooks');

  // Create directories
  mkdirSync(hooksDir, { recursive: true });

  // Copy hook script from package
  const sourceHook = join(__dirname, '..', 'hooks', 'status-hook.sh');
  const targetHook = join(hooksDir, 'status-hook.sh');

  if (!existsSync(targetHook)) {
    copyFileSync(sourceHook, targetHook);
    chmodSync(targetHook, 0o755); // Make executable
  }

  return vibeTermDir;
}
```

---

## Alternatives Considered

### Commander.js

**Version:** 14.0.2 (verified via npm)
**Why not adopted:**
- Would require rewriting all CLI flag handling
- Meow already works; subcommand pattern is simple
- Commander's strength is complex nested subcommands (git-style) - overkill here
- Three subcommands don't justify migration effort

### Yargs

**Version:** 17.x (current)
**Why not adopted:**
- Same rationale as Commander
- Additional complexity with builder/handler pattern
- Meow is lighter weight for simple CLIs

### Node.js native fs.glob

**Version:** Requires Node.js 22.17.0+ for stable API
**Why not adopted:**
- Project targets Node.js 20+ (per engines in package.json)
- Would require bumping minimum Node.js version
- `readdirSync` is sufficient for single-directory scanning

### write-file-atomic

**Version:** 7.0.0 (verified via npm)
**Why not adopted:**
- Designed for concurrent write scenarios
- CLI commands are user-initiated, sequential
- Backup-before-write pattern is sufficient
- One less dependency

### glob / fast-glob

**Why not adopted:**
- No wildcard patterns needed
- Single directory scanning
- Native `readdirSync` with `withFileTypes` is efficient
- Pattern already established in codebase

---

## Integration Points

### Existing services to extend:

| Service | Extension |
|---------|-----------|
| `configService.ts` | Add global settings path constants |
| `directoryService.ts` | Already has expandTilde, directoryExists patterns |

### New services to create:

| Service | Purpose |
|---------|---------|
| `settingsService.ts` | Read/write Claude settings.json with backup |
| `projectDiscoveryService.ts` | Scan ~/.claude/projects/ |
| `hookService.ts` | Install/audit/fix hook configurations |

### CLI structure change:

```
src/
  cli.tsx                    # Entry point - add subcommand routing
  commands/
    setup.ts                 # vibe-term setup implementation
    audit.ts                 # vibe-term audit implementation
    fix.ts                   # vibe-term fix implementation
  services/
    settingsService.ts       # JSON settings manipulation
    projectDiscoveryService.ts # Project scanning
    hookService.ts           # Hook installation logic
```

---

## Version Verification

| Package | Current | v3.0 | Notes |
|---------|---------|------|-------|
| meow | 14.0.0 | 14.0.0 | No change - subcommands via input[0] |
| Node.js fs | n/a | native | Already in use |
| Node.js path | n/a | native | Already in use |
| Node.js os | n/a | native | homedir() already in use |

---

## NOT Recommended

### Switching to Commander for subcommands
**Why avoid:**
- Migration effort not justified for 3 simple subcommands
- Meow's `cli.input[0]` pattern is idiomatic
- Would touch existing working code unnecessarily

### Adding glob libraries for directory scanning
**Why avoid:**
- Single-level directory scan doesn't need glob patterns
- `readdirSync({ withFileTypes: true })` is native and efficient
- Adds dependency for no benefit

### Adding write-file-atomic
**Why avoid:**
- CLI commands are user-initiated, not concurrent
- Simple backup + write pattern is sufficient
- Overkill for small JSON config files

### Upgrading to Node.js 22+ for native fs.glob
**Why avoid:**
- Would break compatibility for Node.js 20 users
- Project explicitly targets Node.js 20+
- No glob patterns actually needed

---

## Confidence Notes

| Area | Level | Notes |
|------|-------|-------|
| Meow subcommand pattern | HIGH | Standard pattern, documented in cli-meow-help examples |
| fs operations for JSON | HIGH | Native Node.js, well-documented |
| npm packaging | HIGH | Standard package.json fields, verified via npm docs |
| Directory structure | HIGH | Follows XDG-like conventions |

---

## Sources

### Primary (HIGH confidence)
- [Meow GitHub](https://github.com/sindresorhus/meow) - v14.0.0 confirmed
- [npm package.json docs](https://docs.npmjs.com/cli/v9/configuring-npm/package-json/) - files, bin, prepublishOnly
- [npm scripts docs](https://docs.npmjs.com/cli/v8/using-npm/scripts/) - prepublishOnly behavior
- [Node.js fs docs](https://nodejs.org/api/fs.html) - Native file system APIs
- [Node.js fs.glob availability](https://www.stefanjudis.com/today-i-learned/node-js-includes-a-native-glob-utility/) - Requires Node.js 22+

### Secondary (MEDIUM confidence)
- [Commander.js GitHub](https://github.com/tj/commander.js) - v14.0.2 confirmed, subcommand API reviewed
- [write-file-atomic npm](https://www.npmjs.com/package/write-file-atomic) - v7.0.0 confirmed
- [npm-compare Commander vs Yargs](https://npm-compare.com/commander,yargs) - Feature comparison

---

*v3.0 Stack research: 2026-01-30*
*Valid until: 2026-03-30 (60 days - stable domain)*

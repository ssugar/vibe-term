# Project Research Summary

**Project:** vibe-term v3.0 - Hook Management & Distribution
**Domain:** CLI tool with npm global install, hook configuration management
**Researched:** 2026-01-30
**Confidence:** HIGH

## Executive Summary

vibe-term v3.0 extends the existing tmux-based HUD with hook management commands (setup/audit/fix) and npm global install distribution. Research reveals this is fundamentally a **configuration management tool** similar to Homebrew's `brew doctor`, npm's `npm audit`, and Husky's hook installer. The technical challenge is straightforward: add CLI subcommands before TUI initialization, manipulate JSON config files with proper backups, and package for npm global install.

The recommended approach leverages the existing stack completely - no new dependencies needed. The existing `meow` CLI parser handles subcommands via `cli.input[0]` routing. Node.js native `fs` operations are sufficient for JSON manipulation with backups. The architecture follows a clear pattern: command router in cli.tsx, dedicated command handlers in `src/commands/`, and shared services for settings/project-discovery/hook-merging operations.

The critical risk is **Claude Code's settings merge behavior**: project-level settings can replace rather than merge with global settings (tracked issues #17017, #11626). This means vibe-term hooks must be installed per-project, not just globally. The mitigation is to build audit/fix commands that scan `~/.claude/projects/` and intelligently merge hooks into project settings without clobbering user's existing configurations. Secondary risks include npm global install path resolution and hook script dependency on `jq`, both solvable with standard patterns (import.meta.dirname and rewriting the hook in Node.js).

## Key Findings

### Recommended Stack

**No new dependencies required.** The existing stack provides all capabilities needed for v3.0:

**Core technologies:**
- **meow 14.0.0**: CLI argument parsing — subcommand routing via `cli.input[0]` pattern (simpler than migrating to Commander)
- **Node.js fs (native)**: File operations — `readFileSync`, `writeFileSync`, `copyFileSync` sufficient for JSON with backup
- **Node.js path/os (native)**: Path resolution — `homedir()`, `expandTilde()` already in use for directory scanning

**Rejected alternatives:**
- Commander/Yargs for subcommands (overkill for 3 commands, meow already works)
- glob/fast-glob for directory scanning (no wildcards needed, `readdirSync` sufficient)
- write-file-atomic for config files (CLI commands are sequential, not concurrent; backup+write is adequate)

**npm packaging additions:**
- Add `files: ["dist", "README.md"]` to limit published files
- Add `prepublishOnly: "npm run build"` to ensure build before publish
- Existing `bin` configuration already correct

### Expected Features

Research into CLI config management tools reveals consistent UX patterns across Homebrew, npm, ESLint, and Husky.

**Must have (table stakes):**
- **Setup command** - Idempotent hook installation with automatic backup (like `npx husky init`)
- **Audit command** - Scan for conflicts with clear pass/warn/fail status and exit codes (like `npm audit`)
- **Fix command** - Dry-run by default with explicit `--apply` flag (like ESLint `--fix`)
- **Colored status output** - Green/yellow/red with status symbols for professional CLI feel
- **Backup before modification** - User trust depends on safe, reversible operations

**Should have (competitive differentiators):**
- **Intelligent hook merging** - Deep merge preserving existing hooks, not naive overwrite (respect user's config)
- **Project discovery from ~/.claude/projects/** - Decode encoded paths, scan for settings files
- **Suggest next command** - After setup, prompt to run audit; after audit with issues, suggest fix
- **Machine-readable output** - `--json` flag for CI/automation integration

**Defer (v2+):**
- Interactive setup wizard with per-project confirmation prompts
- Backup management commands (list/restore/clean backups)
- Hook editor/configurator UI
- Watch mode for continuous conflict monitoring

### Architecture Approach

The architecture follows a **command-or-TUI router pattern**: check for subcommand before any TUI initialization. Subcommands are fast, stateless operations that complete and exit without touching tmux, Ink, or the React TUI infrastructure. This keeps clean separation between CLI utilities and the existing HUD application.

**Major components:**

1. **cli.tsx (modified)** - Add command router at entry point before `ensureTmuxEnvironment()`, route to handlers based on `cli.input[0]`
2. **src/commands/** (new) - Dedicated handlers for setup.ts, audit.ts, fix.ts with console output (not Ink)
3. **src/services/settingsService.ts** (new) - Read/write/backup Claude settings.json files with error handling
4. **src/services/projectDiscoveryService.ts** (new) - Scan ~/.claude/projects/, decode path encoding, find settings files
5. **src/services/hookMergeService.ts** (new) - Intelligent merge strategy that preserves existing user hooks
6. **src/services/vibeTermDirService.ts** (new) - Manage ~/.vibe-term/ directory, install hook scripts

**Data flow:** User runs `vibe-term setup` → cli.tsx routes to setup.ts → vibeTermDirService creates ~/.vibe-term/ → settingsService reads ~/.claude/settings.json → hookMergeService merges hooks → settingsService writes with backup → console output and exit.

**Pattern: Backup Before Modify** - Every settings file modification creates timestamped backup (`settings.json.backup-TIMESTAMP`) first, with clear console output showing backup location for manual restoration.

### Critical Pitfalls

1. **Claude Code settings replace instead of merge** - Project-level `.claude/settings.json` overrides global `~/.claude/settings.json` completely (GitHub issues #17017, #11626). Prevention: Hook management must target each project's settings, not just global. The audit command scans `~/.claude/projects/` to find all projects, and fix command merges hooks into project-level settings.

2. **Hook array deduplication logic** - Running setup multiple times can duplicate hooks, causing hook script to run 2x-4x per event. Prevention: Normalize paths before checking existence (handle `$CLAUDE_PROJECT_DIR`, `~`, variations). Use robust matching that catches different path representations of the same script.

3. **npm global install path resolution** - Hardcoded paths like `/home/user/claude/vibe-term/hooks/status-hook.sh` break after `npm install -g`. Prevention: Use `import.meta.dirname` for package location, include hook scripts in package.json `files` array, reference by resolved absolute path at install time.

4. **Backup files without restoration path** - Creating backups without clear undo mechanism erodes user trust. Prevention: Named backups with human-readable timestamps (`settings.json.vibe-term-backup.2026-01-30T14-30-00`), clear console output showing backup location, document manual restoration with `cp` command.

5. **EACCES permission errors on npm install** - Default global directory requires root, using sudo creates permission problems. Prevention: Document nvm installation or npm prefix configuration in README, never require sudo for installation or operation.

## Implications for Roadmap

Based on research, suggested 5-phase structure following dependency order:

### Phase 1: Foundation Services
**Rationale:** All commands depend on settings manipulation and directory management. Build the infrastructure first.

**Delivers:** Core services for file operations:
- `vibeTermDirService` - Create ~/.vibe-term/, install hook scripts with correct permissions
- `settingsService` - Read/write/backup Claude settings.json with error handling
- Basic test coverage for JSON manipulation and backup creation

**Addresses:** Pitfalls #4 (backup strategy), #6 (directory permissions)

**Research flag:** Standard patterns, skip research-phase

### Phase 2: CLI Command Router
**Rationale:** Establish command routing before implementing individual commands. Single point of change.

**Delivers:**
- Modified cli.tsx with subcommand detection via `cli.input[0]`
- Updated meow help text showing all subcommands
- Exit before TUI initialization when subcommand present

**Uses:** Existing meow CLI parser

**Addresses:** Architecture requirement for command-or-TUI split

**Research flag:** Standard patterns, skip research-phase

### Phase 3: Setup Command
**Rationale:** Highest user value, enables basic hook installation. Independent of project discovery.

**Delivers:**
- `vibe-term setup` command that installs hooks to ~/.claude/settings.json
- Idempotent operation with backup creation
- Clear console output with success/failure reporting

**Addresses:** Table stakes features (setup command, backup before modification)

**Avoids:** Pitfalls #2 (deduplication), #4 (backup strategy)

**Research flag:** Standard patterns, skip research-phase

### Phase 4: Audit Command
**Rationale:** Enables conflict detection. Requires project discovery service.

**Delivers:**
- `projectDiscoveryService` - Scan ~/.claude/projects/ with path decoding
- `vibe-term audit` command with colored status output
- Exit code 0 (clean) or 1 (conflicts found)
- Optional `--json` flag for machine-readable output

**Addresses:** Table stakes (audit command), differentiator (project discovery)

**Avoids:** Pitfall #1 (detecting project-level overrides), #7 (path encoding)

**Research flag:** Need to verify Claude's exact path encoding scheme during implementation

### Phase 5: Fix Command
**Rationale:** Completes the hook management story. Requires merge logic.

**Delivers:**
- `hookMergeService` - Intelligent merge preserving existing hooks
- `vibe-term fix [project]` command with dry-run default
- `--apply` flag to execute changes
- Per-project backup before modification

**Addresses:** Table stakes (fix command with dry-run), differentiator (intelligent merging)

**Avoids:** Pitfall #1 (project-level hook injection), #2 (deduplication)

**Research flag:** May need deeper research on edge cases in hook merging during implementation

### Phase 6: npm Distribution
**Rationale:** Final step - package and test global install after all functionality works.

**Delivers:**
- Updated package.json with `files` and `prepublishOnly`
- Testing with `npm pack` and local tarball install
- README documentation for installation without sudo

**Addresses:** Table stakes (global install), pitfalls #3, #5, #8, #10

**Avoids:** All npm-related pitfalls (path resolution, permissions, shebang issues)

**Research flag:** Standard patterns, but thorough testing required

### Phase Ordering Rationale

- **Foundation first** - Services are dependencies for all commands, build once and reuse
- **Router before commands** - Establish routing pattern, then fill in handlers
- **Setup before audit/fix** - Setup is independent and highest value; audit/fix depend on project discovery
- **Audit before fix** - Users need to see conflicts before fixing them; natural workflow progression
- **Distribution last** - Only package after all functionality is implemented and tested locally

This order minimizes rework and matches the natural user workflow: setup global hooks → audit for conflicts → fix conflicts → distribute to users.

### Research Flags

Phases likely needing deeper research during implementation:
- **Phase 4 (Audit):** May need to verify Claude's exact path encoding scheme in ~/.claude/projects/ through testing
- **Phase 5 (Fix):** Edge cases in hook merging (arrays vs strings, multiple hook types) may require experimentation

Phases with standard patterns (skip research-phase):
- **Phase 1:** Standard file I/O operations
- **Phase 2:** Meow CLI routing pattern well-documented
- **Phase 3:** Setup follows established CLI tool patterns
- **Phase 6:** npm packaging is well-documented, testing-intensive but not research-intensive

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies, existing tools verified sufficient |
| Features | HIGH | Patterns verified across Homebrew, npm, ESLint, Husky |
| Architecture | HIGH | Command router pattern standard, matches existing codebase conventions |
| Pitfalls | HIGH | Claude Code issues verified in GitHub, npm patterns well-documented |

**Overall confidence:** HIGH

All research based on official documentation, verified npm package versions, and concrete GitHub issues for Claude Code behavior. The domain (CLI config management) is mature with well-established patterns.

### Gaps to Address

Minor gaps that need resolution during implementation:

- **Claude's path encoding details**: The `-home-ssugar-claude-vibe-term` encoding is observed but not officially documented. Verify encoding/decoding logic with real project names during Phase 4.

- **Hook merge edge cases**: Need to handle hooks defined as both strings (single command) and arrays (multiple commands) in settings.json. Test during Phase 5 with various configurations.

- **Hook script rewrite**: Current hook uses `jq` for JSON parsing (pitfall #9). Decide in Phase 1 whether to rewrite in Node.js (recommended) or bundle jq with package (not recommended).

- **Session state directory migration**: Current `~/.claude-hud/sessions/` could move to `~/.vibe-term/sessions/` for consistency. Defer to v4 or provide optional migration in v3.

## Sources

### Primary (HIGH confidence)
- [Meow GitHub](https://github.com/sindresorhus/meow) - v14.0.0 CLI parser, input array handling
- [npm package.json docs](https://docs.npmjs.com/cli/v9/configuring-npm/package-json/) - files, bin, prepublishOnly fields
- [Node.js fs docs](https://nodejs.org/api/fs.html) - Native file system APIs
- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings) - Hook configuration
- [GitHub anthropics/claude-code issues #17017, #11626](https://github.com/anthropics/claude-code/issues) - Settings merge behavior
- [CLI Guidelines](https://clig.dev/) - Comprehensive CLI UX patterns
- [npm audit docs](https://docs.npmjs.com/cli/v9/commands/npm-audit/) - Audit command patterns
- [Homebrew Troubleshooting](https://docs.brew.sh/Troubleshooting) - Doctor pattern
- [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface) - Fix patterns
- [Husky Get Started](https://typicode.github.io/husky/get-started.html) - Setup command patterns

### Secondary (MEDIUM confidence)
- [Commander.js GitHub](https://github.com/tj/commander.js) - Alternative CLI framework comparison
- [npm EACCES permission errors](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally/) - Installation without sudo
- [write-file-atomic npm](https://www.npmjs.com/package/write-file-atomic) - Atomic write alternative evaluation
- [env-paths npm](https://www.npmjs.com/package/env-paths) - Cross-platform config directories
- [ESM __dirname alternatives](https://blog.logrocket.com/alternatives-dirname-node-js-es-modules/) - Path resolution in ES modules

### Verified from Codebase
- Existing `src/cli.tsx` - Current TUI launch flow
- Existing `src/services/configService.ts`, `directoryService.ts` - Service patterns to follow
- Existing `status-hook.sh` - Current hook implementation and jq dependency
- `~/.claude/projects/` structure - Path encoding observation (-home-ssugar-format)
- `~/.claude/settings.json` - Global hook configuration location

---
*Research completed: 2026-01-30*
*Ready for roadmap: yes*

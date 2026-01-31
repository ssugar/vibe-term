# Feature Landscape: CLI Config Management Tools

**Domain:** CLI hook/config management commands
**Researched:** 2026-01-30
**Confidence:** HIGH (patterns well-established across npm, Homebrew, Husky, ESLint)

## Executive Summary

Research into CLI config management tools (Homebrew's `brew doctor`, npm's `npm audit`, Husky's `npx husky init`, ESLint's `--fix`) reveals consistent UX patterns for setup/audit/fix workflows. Users expect:

1. **Setup commands** that work idempotently with automatic backups
2. **Audit commands** that report status clearly (pass/warn/fail with counts)
3. **Fix commands** with dry-run preview before modification

Key insight: The `doctor` pattern (health check with actionable suggestions) is universally understood. Users expect colored output with status indicators, and explicit confirmation for destructive operations.

## Table Stakes

Features users expect from any CLI config management tool. Missing these = product feels incomplete.

### Setup Command (`vibe-term setup`)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Idempotent execution | Safe to run multiple times | Low | Like `npx husky init` |
| Automatic backup before modification | Users fear config loss | Low | `settings.json.backup-TIMESTAMP` |
| Clear success/failure output | Know if it worked | Low | Colored status with checkmarks |
| Show what was changed | Transparency builds trust | Low | List modified files |
| Create ~/.vibe-term/ directory | Persistent hook script location | Low | Independent of npm install path |
| Non-interactive mode support | CI/automation use | Low | `--yes` flag skips prompts |

**Sources:** [Homebrew Troubleshooting](https://docs.brew.sh/Troubleshooting), [Husky Get Started](https://typicode.github.io/husky/get-started.html), [CLI Guidelines](https://clig.dev/)

### Audit Command (`vibe-term audit`)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Project discovery from ~/.claude/projects/ | Core use case | Medium | Decode encoded path names |
| Clear pass/warn/fail status per project | Scannable output | Low | Like `npm audit` summary |
| Count of issues found | Quick health check | Low | "3 projects have conflicts" |
| Exit code reflects status | CI integration | Low | 0=clean, 1=issues found |
| List specific conflicts found | Actionable output | Medium | Which hooks are overridden |
| Human-readable default output | Console-first | Low | Colored, structured |

**Sources:** [npm audit docs](https://docs.npmjs.com/cli/v9/commands/npm-audit/), [npm doctor](https://docs.npmjs.com/cli/v6/commands/npm-doctor/), [brew doctor pattern](https://docs.brew.sh/Troubleshooting)

### Fix Command (`vibe-term fix`)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Dry-run by default | Preview before modify | Low | Like `rsync -n` |
| Explicit `--apply` to execute | Prevent accidents | Low | Moderate danger level |
| Backup before modification | Reversible changes | Low | Per-project backups |
| Merge, don't overwrite | Preserve user hooks | Medium | Add vibe-term alongside existing |
| Report what would change | Transparency | Low | List files and changes |
| Selective fix (single project) | Granular control | Low | `vibe-term fix /path/to/project` |

**Sources:** [ESLint --fix](https://eslint.org/docs/latest/use/command-line-interface), [Prettier CLI](https://prettier.io/docs/cli), [CLI Guidelines danger levels](https://clig.dev/)

### Output Formatting

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Colored output (green/yellow/red) | Status at a glance | Low | Existing in Ink ecosystem |
| Status symbols (checkmarks, X, warning) | Universal patterns | Low | Use figures library |
| Respect NO_COLOR environment | Accessibility | Low | Disable colors in CI/pipes |
| Machine-readable option | Scripting support | Low | `--json` flag |

**Sources:** [CLI Guidelines colors](https://clig.dev/), [Better CLI colors](https://bettercli.org/design/using-colors-in-cli/)

## Differentiators

Features that set this product apart. Not expected, but valued.

### Intelligent Hook Merging

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Deep merge JSON preserving structure | Don't lose user's custom hooks | Medium | lodash-style deep merge |
| Detect already-configured projects | Skip unnecessary work | Low | Idempotent fix |
| Handle multiple hook entries | Some projects have complex hooks | Medium | Array merging strategy |
| Preserve comments if present | User documentation | High | JSON5 or manual preservation |

**Why differentiating:** Most tools overwrite configs. Intelligent merging shows respect for user's existing setup.

**Sources:** [jsonmerge strategies](https://github.com/avian2/jsonmerge), [boxboat/config-merge](https://github.com/boxboat/config-merge)

### Project Discovery Intelligence

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Decode ~/.claude/projects/ encoded paths | Find all Claude-touched projects | Low | URL-style encoding |
| Filter to projects with settings.json | Only show relevant projects | Low | Skip projects without conflicts |
| Group by conflict type | Prioritized action | Low | "Missing hooks" vs "Conflicting hooks" |
| Show last-used timestamp | Prioritize active projects | Medium | From Claude project metadata |

**Why differentiating:** Deep Claude ecosystem integration shows this is purpose-built, not generic.

### Interactive Mode

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Guided setup wizard | First-time user onboarding | Medium | Step-by-step prompts |
| Per-project fix confirmation | Granular control | Medium | "Fix this project? [y/n/all]" |
| Undo suggestion after fix | Safety net | Low | "To undo: cp backup original" |

**Why differentiating:** Interactive mode lowers barrier for new users while power users use flags.

### Help and Suggestions

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Suggest next command after setup | Guide the workflow | Low | "Run `vibe-term audit` to check projects" |
| Explain why conflict matters | Educational | Low | "Project hooks override global hooks" |
| Link to documentation | Self-service | Low | "See https://... for details" |

**Why differentiating:** Transforms tool from utility to guide. Per CLI Guidelines: "suggest what commands to run next."

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

### Don't Build: Auto-fix Without Confirmation

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Fix command that modifies by default | Users lose config unexpectedly | Dry-run default, require `--apply` |

**Rationale:** Per CLI Guidelines, "moderate danger" operations (bigger changes, remote deletions) should prompt and offer dry-run. Config modification falls in this category.

### Don't Build: Complex Merge Strategies UI

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Interactive merge conflict resolution | Over-engineering for simple use case | Simple add-if-missing strategy |

**Rationale:** vibe-term hooks are additive. We're not trying to be a general JSON merge tool. If hooks conflict in complex ways, suggest manual resolution.

### Don't Build: Backup Management UI

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| `vibe-term backup list/restore/clean` | Scope creep, edge case | Show backup path, let user manage manually |

**Rationale:** Users know how to `cp` and `rm`. Backups are safety net, not primary feature.

### Don't Build: Hook Editor/Configurator

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| `vibe-term config edit` GUI | Complexity explosion | Direct JSON editing is fine for power users |

**Rationale:** Hook configuration is write-once. Users don't need UI to edit hooks regularly.

### Don't Build: Watch Mode for Conflicts

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Continuous audit watching for new conflicts | Overkill, resource waste | Run `audit` manually or in CI |

**Rationale:** Conflicts don't appear dynamically. They appear when user creates new project settings. On-demand audit is sufficient.

### Don't Build: Global Undo Command

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| `vibe-term undo` to revert all changes | Complex state tracking | Timestamped backups, manual restore |

**Rationale:** Backup files are simple. Adding undo state management creates new failure modes.

## Feature Dependencies

```
+-----------------------------------------------------------+
|                 EXISTING INFRASTRUCTURE                   |
|  - hookStateService.ts (reads ~/.claude-hud/sessions/)    |
|  - Ink/React TUI framework                                |
|  - meow CLI argument parsing                              |
|  - figures library for symbols                            |
+-----------------------------------------------------------+
                            |
                            v
+-----------------------------------------------------------+
|                 v3.0 CLI COMMANDS                         |
|                                                           |
|  +-------------------+                                    |
|  | Project Discovery |                                    |
|  | (new service)     |                                    |
|  +-------------------+                                    |
|           |                                               |
|           v                                               |
|  +-------------------+     +-------------------+          |
|  | vibe-term setup   |---->| ~/.vibe-term/     |          |
|  | (global hooks)    |     | directory setup   |          |
|  +-------------------+     +-------------------+          |
|           |                                               |
|           v                                               |
|  +-------------------+                                    |
|  | vibe-term audit   |                                    |
|  | (scan projects)   |                                    |
|  +-------------------+                                    |
|           |                                               |
|           v                                               |
|  +-------------------+                                    |
|  | vibe-term fix     |                                    |
|  | (merge hooks)     |                                    |
|  +-------------------+                                    |
+-----------------------------------------------------------+
```

**Dependency notes:**
- Project discovery is foundational - audit and fix depend on it
- Setup must work standalone (user may only use global hooks)
- Audit and fix share project discovery logic
- All commands share output formatting utilities

## MVP Recommendation

For v3.0 MVP, prioritize in this order:

### Must Have (Table Stakes)
1. **`vibe-term setup`** - Install global hooks with backup
2. **`vibe-term audit`** - Scan and report conflicts
3. **`vibe-term fix --apply`** - Merge hooks with backup
4. **Colored status output** - Professional CLI feel
5. **`--json` flag** - Machine-readable output
6. **Dry-run default for fix** - Safety first

### Should Have (Key Differentiators)
7. **Intelligent merge (add-if-missing)** - Don't clobber user hooks
8. **Project discovery from ~/.claude/projects/** - Claude ecosystem integration
9. **Suggest next command** - Guided workflow
10. **`--yes` flag for non-interactive** - CI/automation support

### Defer to v4
- Interactive setup wizard
- Per-project fix confirmation prompts
- Backup management commands
- Watch mode for conflicts

## Command Summary

**v3.0 Command Map:**

| Command | Purpose | Flags |
|---------|---------|-------|
| `vibe-term setup` | Install global hooks | `--yes` (skip confirmation) |
| `vibe-term audit` | Scan for conflicts | `--json` (machine output) |
| `vibe-term fix` | Preview fixes (dry-run) | `--json` |
| `vibe-term fix --apply` | Apply fixes | `--yes` (no confirmation) |
| `vibe-term` | Launch TUI (existing) | `--refresh` |

**Exit codes:**
- 0: Success / No issues
- 1: Issues found (audit) / Error occurred

## Sources

### Primary (HIGH confidence)
- [CLI Guidelines](https://clig.dev/) - Comprehensive CLI UX patterns
- [Homebrew Troubleshooting / brew doctor](https://docs.brew.sh/Troubleshooting) - Doctor pattern
- [npm audit docs](https://docs.npmjs.com/cli/v9/commands/npm-audit/) - Audit command patterns
- [npm doctor](https://docs.npmjs.com/cli/v6/commands/npm-doctor/) - Diagnostic command patterns
- [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface) - --fix patterns
- [Prettier CLI](https://prettier.io/docs/cli) - --write and --list-different patterns
- [Husky Get Started](https://typicode.github.io/husky/get-started.html) - Setup command patterns

### Secondary (MEDIUM confidence)
- [boxboat/config-merge](https://github.com/boxboat/config-merge) - JSON merge strategies
- [git-json-merge](https://github.com/jonatanpedersen/git-json-merge) - JSON conflict resolution
- [UX patterns for CLI tools](https://lucasfcosta.com/2022/06/01/ux-patterns-cli-tools.html) - Status output patterns
- [Heroku CLI Style Guide](https://devcenter.heroku.com/articles/cli-style-guide) - CLI output conventions

### Tertiary (LOW confidence)
- WebSearch results on CLI dry-run patterns - Community consensus
- WebSearch results on JSON config merge patterns - Various approaches

## Metadata

**Confidence breakdown:**
- Table stakes features: HIGH - Universal patterns across major CLI tools
- Differentiators: MEDIUM - Some complexity in merge strategies
- Anti-features: HIGH - Clear scope boundaries based on CLI Guidelines
- Command structure: HIGH - Based on established CLI conventions

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (30 days - stable domain)

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-30)

**Core value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.
**Current focus:** Phase 15 - Fix Command (v3.0 Hook Management & Distribution) - COMPLETE

## Current Position

Phase: 15 of 17 (Fix Command) - COMPLETE
Plan: 02 of 02 (fix CLI command) - COMPLETE
Status: Phase complete
Last activity: 2026-02-01 — Completed 15-02-PLAN.md

Progress: [##########################....] 88% (15/17 phases complete)

## Performance Metrics

**v1.0 Completed:**
- Total plans: 15
- Total execution time: ~109 min
- Average duration: ~7.3 min/plan

**v2.0 Completed:**
- Total plans: 13 (Phase 7: 3, Phase 8: 3, Phase 9: 3, Phase 10: 3, Phase 11: 1)
- Average duration: ~6 min/plan

**v3.0:**
- Total plans: TBD (2 phases remaining to plan)
- Completed: 8 (Phase 12: 12-01 3min, 12-02 2min; Phase 13: 13-01 1min, 13-02 3min; Phase 14: 14-01 4min, 14-02 3min; Phase 15: 15-01 3min, 15-02 3min)

## Accumulated Context

### Decisions

*Carried forward from v1.0/v2.0:*

- ESM-only project (type: module) required for Ink 6.x
- .js extension in TS imports for ESM compatibility
- **PIVOTED:** Hooks over JSONL parsing (JSONL format unreliable, hooks authoritative)
- Global hooks in ~/.claude/settings.json for cross-project tracking
- tmux splits over embedded terminal (native reliability)
- Minimal HUD strip (1-2 lines max)

*New for v3.0:*

- ~/.vibe-term/ for hooks script and config (persistent, portable)
- Intelligent hook merging (preserve project hooks while adding vibe-term's)
- CLI subcommands before TUI initialization (command-or-TUI router pattern)
- picocolors for CLI colored output (lightweight, no dependencies)
- figures for cross-platform status symbols
- node: prefix required for Node.js built-in imports with tsup bundler
- Dynamic import for CLI subcommands (code splitting)
- EXIT_CODES constant pattern: SUCCESS=0, ERROR=1, USER_ABORT=2
- micromatch for glob pattern matching (faster than minimatch)
- Sessions-index.json resolution for project paths (never decode from directory name)
- Preview/Apply pattern: generateFixPreview shows what will change, applyFix executes with safety
- Backup validation: read-back and parse JSON after write to catch corruption
- Dry-run by default for fix command, --apply required to execute changes
- Per-project confirmation with y/N prompt (safe default, auto-proceed in CI)

### Pending Todos

- Future: Display subagent model breakdown (e.g., "+1 haiku, +2 sonnet")
- Add kill tab functionality (close specific session from HUD)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-01
Stopped at: Completed 15-02-PLAN.md (Phase 15 complete)
Resume file: None

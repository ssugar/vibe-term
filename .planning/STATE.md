# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.
**Current focus:** Milestone v2.0 — Phase 7 (tmux Foundation)

## Current Position

Phase: 7 of 11 (tmux Foundation)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-01-25 — Completed 07-01-PLAN.md

Progress: [##########..........] 53% (v1.0 complete, v2.0 plan 1/~9 done)

## Performance Metrics

**v1.0 Completed:**
- Total plans: 15
- Total execution time: ~109 min
- Average duration: ~7.3 min/plan

**v2.0:**
- Total plans: TBD (estimated 9-11)
- Completed: 1
- Execution time: 2 min
- Average duration: 2 min/plan

## Accumulated Context

### Decisions

*Carried forward from v1.0:*

- ESM-only project (type: module) required for Ink 6.x
- .js extension in TS imports for ESM compatibility
- 2-second default refresh interval for state updates
- Custom formatRelativeTime instead of date-fns (simpler, no dependency)
- useInterval hook pattern from Dan Abramov for stale closure handling
- Selective Zustand subscriptions to prevent unnecessary re-renders
- Shell commands over npm packages for process detection (ps, readlink, lsof, tmux)
- Graceful degradation: return empty arrays on command failure
- **PIVOTED:** Hooks over JSONL parsing (JSONL format unreliable, hooks authoritative)
- Global hooks in ~/.claude/settings.json for cross-project tracking
- mainModel preservation (only update on UserPromptSubmit to avoid subagent overwrite)
- 200K context window standard for all Claude 4.x models
- Tail-read optimization (last 50KB) and mtime caching for JSONL parsing

*New for v2.0:*

- tmux splits over embedded terminal (native reliability)
- Evolve v1.0 codebase (don't rewrite)
- Minimal HUD strip (1-2 lines max)
- No new npm dependencies (tmux CLI via execAsync)
- **07-01:** spawnSync (not execAsync) for synchronous startup before Ink
- **07-01:** stdio: 'inherit' for terminal handoff to tmux
- **07-01:** No auto-create config file - users create manually
- **07-01:** Config validation with type guards

### Pending Todos

- Future: Display subagent model breakdown (e.g., "+1 haiku, +2 sonnet")

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-25
Stopped at: Completed 07-01-PLAN.md
Resume file: None

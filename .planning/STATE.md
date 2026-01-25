# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.
**Current focus:** Milestone v2.0 — Defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-01-25 — Milestone v2.0 started

Progress: [░░░░░░░░░░] 0% (new milestone)

## Performance Metrics

**v1.0 Completed:**
- Total plans: 15
- Total execution time: ~109 min
- Average duration: ~7.3 min/plan

*v2.0 metrics will be tracked after execution begins*

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

### Pending Todos

- Future: Display subagent model breakdown (e.g., "+1 haiku, +2 sonnet")

### Blockers/Concerns

None.

### Quick Tasks Completed

*See MILESTONES.md for v1.0 quick tasks*

## Session Continuity

Last session: 2026-01-25
Stopped at: Starting v2.0 milestone
Resume file: None

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-22)

**Core value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress.
**Current focus:** Phase 4 - Context Window (in progress)

## Current Position

Phase: 4 of 6 (Context Window)
Plan: 1 of 2 in phase 4 complete
Status: In progress
Last activity: 2026-01-24 - Completed 04-01-PLAN.md

Progress: [######....] 71% (11/15 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: ~8 min
- Total execution time: ~86 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 24 min | 8 min |
| 02-session-detection | 3 | 14 min | ~5 min |
| 03-status-detection | 4 | ~42 min | ~10 min |
| 04-context-window | 1 | 6 min | 6 min |

**Recent Trend:**
- Last 5 plans: 03-02 (2 min), 03-03 (5 min), 03-04 (~30 min), 04-01 (6 min)
- Trend: Context window plan executed quickly, one bug fix for JSONL format

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- ESM-only project (type: module) required for Ink 6.x
- .js extension in TS imports for ESM compatibility
- 2-second default refresh interval for state updates
- Custom formatRelativeTime instead of date-fns (simpler, no dependency)
- useInterval hook pattern from Dan Abramov for stale closure handling
- Selective Zustand subscriptions to prevent unnecessary re-renders
- Ctrl+C detected via key.ctrl in useInput (Ink raw mode)
- Use useAppStore.getState() in callbacks to avoid dependency issues
- Shell commands over npm packages for process detection (ps, readlink, lsof, tmux)
- Graceful degradation: return empty arrays on command failure
- Parent PID matching for tmux correlation
- Use claude-${pid} as stable session ID for correlation
- Disambiguate duplicate folder names with parent/folder format
- Stable session ordering: existing maintain position, new added at end by age
- 24-char max project name width with ellipsis truncation (SessionRow layout)
- Cyan bold index numbers to suggest hotkeys
- **PIVOTED:** Hooks over JSONL parsing (JSONL format unreliable, hooks authoritative)
- Global hooks in ~/.claude/settings.json for cross-project tracking
- mainModel preservation (only update on UserPromptSubmit to avoid subagent overwrite)
- SubagentStart/Stop tracking with count display (+N indicator)
- SessionEnd cleanup removes stale state files
- **NEW:** 200K context window standard for all Claude 4.x models
- **NEW:** JSONL format is nested: data.message.type='assistant', data.message.message.usage
- **NEW:** Tail-read optimization (last 50KB) and mtime caching for JSONL parsing

### Pending Todos

- Future: Display subagent model breakdown (e.g., "+1 haiku, +2 sonnet")

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-24
Stopped at: Completed 04-01-PLAN.md (Context service for JSONL parsing)
Resume file: None

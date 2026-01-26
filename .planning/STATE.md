# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.
**Current focus:** Milestone v2.0 — Phase 8 (HUD Strip UI) complete

## Current Position

Phase: 8 of 11 (HUD Strip UI)
Plan: 3 of 3 in current phase
Status: Phase complete, pending verification
Last activity: 2026-01-26 — Completed 08-03-PLAN.md

Progress: [###############.....] 75% (v1.0 complete, Phases 7-8 complete)

## Performance Metrics

**v1.0 Completed:**
- Total plans: 15
- Total execution time: ~109 min
- Average duration: ~7.3 min/plan

**v2.0:**
- Total plans: 6 complete (Phase 7: 3, Phase 8: 3)
- Completed: 6
- Average duration: ~6 min/plan

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

*Phase 7 learnings:*

- Use absolute paths when running commands inside tmux (relative paths unreliable)
- spawnSync for startup (must be synchronous), execAsync after in tmux
- HUD pane stays where CLI runs; create main pane below and resize HUD
- Keybindings: Ctrl+g (focus HUD), Ctrl+\ (detach) work from any pane
- Session options scoped to session (-t flag, no -g) to avoid affecting other tmux sessions

*Phase 8 learnings:*

- Unicode ellipsis (\u2026) for compact truncation (single char vs 3)
- Context color thresholds: green (<30%), yellow (30-70%), red (>70%)
- Blocked sessions pinned left (always visible regardless of scroll)
- Auto-scroll keeps selected tab visible in overflow scenarios
- Arrow indicators (figures.arrowLeft/Right) for overflow detection
- React hooks must ALL be called before any conditional returns
- Inline prompts instead of overlays for compact pane (3 lines)
- client-attached hook enables recovery on direct `tmux attach`
- createHudLayout should check pane count to avoid duplicate splits

### Pending Todos

- Future: Display subagent model breakdown (e.g., "+1 haiku, +2 sonnet")

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-26
Stopped at: Completed Phase 8, pending verification
Resume file: None

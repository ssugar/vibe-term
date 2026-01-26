# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.
**Current focus:** Milestone v2.0 — Phase 9 (Pane Architecture) complete

## Current Position

Phase: 9 of 11 (Pane Architecture)
Plan: 3 of 3 in current phase
Status: Phase 9 complete, verified
Last activity: 2026-01-26 — Completed Phase 9

Progress: [##################..] 90% (v1.0 complete, Phases 7-9 complete)

## Performance Metrics

**v1.0 Completed:**
- Total plans: 15
- Total execution time: ~109 min
- Average duration: ~7.3 min/plan

**v2.0:**
- Total plans: 9 complete (Phase 7: 3, Phase 8: 3, Phase 9: 3)
- Completed: 9
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

*Phase 9 learnings:*

- Sanitize session IDs for tmux env var names (non-alphanumeric -> underscore)
- activeSessionId separate from selectedIndex (displayed vs cursor browsing)
- Scratch window pattern for storing inactive session panes
- Four visual states for tabs: blocked/active+selected/active/selected
- Dual keybindings (C-g and C-h) for HUD focus with backward compatibility
- Use stable paneId (like %10) not window.pane indices (change on swap)
- tmux new-window needs colon suffix for auto-assign index
- Explicit `cd dir && claude` more reliable than -c flag
- Tilde (~) must be expanded before quotes (bash doesn't expand in quotes)
- Check internal vs external sessions for swap-pane vs select-pane

### Pending Todos

- Future: Display subagent model breakdown (e.g., "+1 haiku, +2 sonnet")
- Phase 10: Tab completion for directory input
- Phase 10: mkdir -p for non-existing directories
- Phase 10: Filter sessions (only show claude-terminal + manageable external tmux)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-26
Stopped at: Completed Phase 9
Resume file: None

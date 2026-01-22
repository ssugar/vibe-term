# Phase 2: Session Detection - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Detect running Claude Code instances and display them in a list with project identification and session duration. Users see all running sessions with auto-refresh. Status parsing, navigation, and terminal jumping are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Display layout
- Standard row format: Index | Project | Duration | Status placeholder
- Fixed column widths, may truncate long content
- Truncate project names with ellipsis at end (my-very-long-project-n…)
- Highlighted/bold index numbers (1-9) to hint at future hotkey navigation

### Session identification
- Show folder name only as primary identifier (cc-tui-hud, not full path)
- Don't show tmux window/pane context — project name is sufficient
- Disambiguate duplicate folder names by adding parent folder (projectA/api vs projectB/api)
- Show visual indicator to distinguish tmux sessions from non-tmux terminals

### Duration display
- Relative readable format: 2 min, 1 hr, 3 days (abbreviated but clear)
- Two units when relevant: 3 hr 45 min, but just 5 min for short sessions
- Sessions under 1 minute show "just now" or "< 1 min" (no exact seconds)
- Fixed-width duration column, right-aligned

### List behavior
- Sort by oldest first (longest-running sessions at top)
- New sessions added to end of list (don't insert in order, avoid disruption)
- Show all sessions even if many (compress to fit rather than scroll)
- Brief fade-out when session ends (show as "ended" briefly before removal)

### Claude's Discretion
- Exact column widths and spacing
- Specific indicator icon/text for tmux vs non-tmux
- Fade-out timing and visual treatment
- How to compress rows when many sessions exist

</decisions>

<specifics>
## Specific Ideas

- Index numbers should visually suggest they're hotkeys (even though navigation comes in Phase 5)
- "Brief fade-out" gives user feedback that a session ended rather than just vanishing
- Oldest-first ordering means stable indices for sessions you've been working with longest

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-session-detection*
*Context gathered: 2026-01-22*

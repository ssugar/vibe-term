# Phase 11: Navigation Integration - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Re-validate keyboard navigation from v1.0 works correctly in the new tmux-integrated HUD strip architecture. Fix any bounds issues with selectedIndex. Users can navigate sessions with j/k/arrows, quick-jump with 1-9, switch with Enter, quit with q, and view help with ?.

</domain>

<decisions>
## Implementation Decisions

### Bounds behavior
- Navigation stops at list edges (no wrap-around)
- If selected session dies, selection moves to previous session (or stays at 0 if first)
- 1-9 hotkeys use absolute session index (1 = always first session, even if scrolled)
- Claude's discretion: whether selection tracks session ID or index when list changes

### Help display
- Pressing ? expands the HUD pane temporarily to show full keybindings
- Any key dismisses help and shrinks HUD back to normal
- Help shows all keybindings: j/k, arrows, 1-9, Enter, n, q, ?, Ctrl+h
- Include tmux-level bindings (Ctrl+h to focus HUD) in help display

### Error feedback
- Invalid hotkey (e.g., 9 with only 3 sessions) shows status message: "No session 9"
- Claude's discretion: message display duration
- Failed session switch (dead session) shows message AND cleans up the dead session
- Pressing q with active Claude sessions shows confirmation noting sessions will be terminated

### Focus indicators
- HUD shows border highlight when it has keyboard focus
- Keybinding hints hidden when HUD is unfocused (shown when focused)
- Claude's discretion: visual distinction between selected tab (cursor) vs active session (in main pane)

### Claude's Discretion
- Selection tracking: follow session ID or preserve index when list reorders
- Error message display duration (suggest 1.5-2 seconds)
- Visual styling for selected vs active tab distinction (if any)

</decisions>

<specifics>
## Specific Ideas

- Ctrl+h focuses HUD (not Ctrl+g) — confirmed from Phase 9 implementation
- Quit confirmation should be clear that Claude sessions will be terminated

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-navigation-integration*
*Context gathered: 2026-01-28*

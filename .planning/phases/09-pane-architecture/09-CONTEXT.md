# Phase 9: Pane Architecture - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable session switching using native tmux pane operations with one-keypress return to HUD. Users can switch between Claude sessions in the main pane and navigate back to the HUD strip efficiently.

</domain>

<decisions>
## Implementation Decisions

### Pane layout
- HUD pane fixed at top (2-3 lines), main pane fills the rest below
- HUD height is fixed, not user-resizable
- On terminal resize, HUD stays fixed, main pane absorbs the resize
- When no session is selected, main pane shows empty state with instructions ("Press Enter on a session to open it here")

### Session switching
- Pressing Enter on a session switches the main pane content to attach to that session
- Focus automatically moves to the main pane after switching (user can immediately type)
- If selected session no longer exists, show error in HUD strip (stay focused on HUD)
- Instant switch, no visual transition effects

### Return-to-HUD behavior
- Change keybinding from Ctrl+g to **Ctrl+h** (H for HUD mnemonic)
- Ctrl+h works from anywhere as a tmux-level binding (returns to HUD regardless of current pane)
- Selection is preserved when returning to HUD (same session tab stays highlighted)
- **Distinct active marker** (underline or bold) shows which session is currently displayed in main pane
  - This is separate from selection highlight — selection can move around while exploring, active marker shows what's actually in the main pane

### Multi-session handling
- Multiple panes architecture: each session gets its own tmux pane
- Switch changes which pane is visible/focused, but all sessions persist in background
- External tmux sessions running Claude appear in HUD and can be switched to (as long as they're in tmux)
- External non-tmux sessions show in HUD but cannot be switched to
- When a session exits, its pane is removed and HUD auto-selects the next available session

### Claude's Discretion
- Exact implementation of active marker (underline vs bold vs other)
- How to handle pane ordering/z-index in tmux
- Specific tmux commands used for pane manipulation
- Error message wording and display duration

</decisions>

<specifics>
## Specific Ideas

- Ctrl+h mnemonic: "H for HUD" — easy to remember
- Active marker needs to be visually distinct from selection highlight so users know the difference between "where I'm looking" vs "what's showing in main pane"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-pane-architecture*
*Context gathered: 2026-01-26*

# Phase 10: Session Lifecycle - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Manage the full lifecycle of Claude sessions: spawning new sessions with `n` key, detecting external tmux sessions running Claude, and automatically cleaning up dead sessions. Session list updates in real-time.

</domain>

<decisions>
## Implementation Decisions

### New session flow
- Press `n` to spawn new session
- Default working directory: home directory (~)
- If directory doesn't exist: offer to create it ("Directory doesn't exist. Create it? y/n")
- Start immediately after directory input (no confirmation step)
- Auto-name session from directory basename (e.g., "my-project")

### External session detection
- Two categories of sessions in HUD:
  1. **Managed sessions** — spawned by claude-terminal, swappable via scratch window
  2. **External sessions** — Claude running in other tmux sessions, shown separately
- Display: managed tabs on left, external tabs on right with divider
- External sessions can be "adopted" if feasible — link only (keep in original location, allow switching to it)

### Session cleanup
- Session is "dead" when Claude process exits (not when pane closes)
- Dead sessions: auto-remove from HUD silently
- Pane cleanup: close pane automatically when Claude exits
- If active session dies: switch focus to HUD pane

### Directory input UX
- Input appears on bottom line below tabs (if space allows)
- Tab completion: yes, full directory completion (Tab cycles through matches)
- Tilde expansion: expand on submit (~/foo → /home/user/foo when Enter pressed)
- Cancel: both Escape key and empty Enter cancel input

### Claude's Discretion
- Tab completion implementation details
- Exact polling interval for dead session detection
- Visual styling of external session divider

</decisions>

<specifics>
## Specific Ideas

- External sessions should be clearly visually distinct from managed sessions — they're "view only" unless adopted
- Adoption means linking, not moving — user's original tmux layout stays intact

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-session-lifecycle*
*Context gathered: 2026-01-26*

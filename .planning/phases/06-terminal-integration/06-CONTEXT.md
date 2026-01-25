# Phase 6: Terminal Integration - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable jumping to non-tmux Claude sessions by focusing their terminal windows. Phase 5 already implemented tmux session jumping — this phase adds support for regular terminal windows (not running in tmux) across Linux, WSL2, and macOS.

</domain>

<decisions>
## Implementation Decisions

### Platform support
- Best effort on all platforms with graceful degradation
- X11 first for Linux (xdotool/wmctrl) — most compatible, WSL2 typically runs X11
- macOS via AppleScript targeting Terminal.app only
- WSL2 should attempt to focus Windows Terminal via PowerShell

### Focus mechanism
- Immediate focus steal — no confirmation, no delay
- Attempt to focus specific tab where Claude runs (not just the app)
- HUD continues running after jumping (stays in background)
- Quick return to HUD is a core value — should be supported in this phase

### Fallback behavior
- Show error message with fix hint when focus isn't possible
  - Example: "Cannot focus: xdotool not found. Install with: apt install xdotool"
- If target window no longer exists: show error, keep session in list (will disappear on next refresh)
- Errors auto-dismiss after 5-10 seconds (longer than tmux errors to allow reading hints)

### Session matching
- Both PID-based lookup and window title matching
  - Try PID tracing first (more reliable)
  - Fall back to title matching if PID approach fails
- If multiple windows match, focus first match (user deals with ambiguity)
- Always re-scan windows fresh on each jump (no caching)

### Claude's Discretion
- Exact tool dependency checking approach (check at runtime vs document requirements)
- Specific X11 tool choice between xdotool vs wmctrl
- Auto-dismiss timeout duration within 5-10 second range
- Implementation details of quick-return-to-HUD hotkey

</decisions>

<specifics>
## Specific Ideas

- User emphasized "quick return to HUD is a core value" — this should not be deferred
- Match existing error pattern from tmux jumping (x key dismiss, auto-clear)
- Longer error display time than tmux errors since fix hints need reading

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-terminal-integration*
*Context gathered: 2026-01-25*

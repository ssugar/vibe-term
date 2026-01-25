---
phase: 06-terminal-integration
plan: 01
subsystem: services
tags: [terminal, window-focus, xdotool, osascript, powershell, cross-platform]

# Dependency graph
requires:
  - phase: 05-02
    provides: jumpService foundation for session jumping
  - phase: 02-session-detection
    provides: Session type with pid and projectName
provides:
  - Cross-platform terminal window focus (Linux/macOS/WSL2)
  - Non-tmux sessions now attempt focus instead of failing
  - Installation hints when tools are missing
  - Wayland detection with appropriate error message
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Platform-specific focus dispatch via switch statement"
    - "Process tree walking for terminal PID discovery"
    - "Runtime dependency detection with hasCommand"
    - "FocusResult with hint field for user guidance"

key-files:
  created:
    - src/services/windowFocusService.ts
  modified:
    - src/services/jumpService.ts

key-decisions:
  - "xdotool for Linux X11 (PID-based search, title fallback)"
  - "osascript for macOS Terminal.app activation (app-level, not tab)"
  - "PowerShell SetForegroundWindow for WSL2 Windows Terminal focus"
  - "Wayland detection blocks with helpful error message"
  - "Max depth 10 for process tree walking"

patterns-established:
  - "FocusResult interface: { success, message, hint? }"
  - "Platform-specific implementations with graceful fallbacks"
  - "Combine hint with message for JumpResult user feedback"

# Metrics
duration: 2min
completed: 2026-01-25
---

# Phase 6 Plan 1: Window Focus Service Summary

**Cross-platform terminal window focus using xdotool/osascript/PowerShell with Wayland detection and installation hints**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-25T17:54:43Z
- **Completed:** 2026-01-25T17:57:04Z
- **Tasks:** 2 (both auto)
- **Files modified:** 2

## Accomplishments

- Created windowFocusService.ts with platform-specific focus implementations
- Linux (X11): xdotool with PID-based search and title fallback
- macOS: osascript to activate Terminal.app
- WSL2: PowerShell SetForegroundWindow API for Windows Terminal
- Wayland detection with clear error message and hint
- Runtime dependency detection for xdotool with install hint
- Process tree walking to find terminal emulator PID
- Updated jumpService to use focusTerminalWindow for non-tmux sessions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create windowFocusService.ts** - `01d52fe` (feat)
2. **Task 2: Integrate into jumpService** - `d3d8284` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/services/windowFocusService.ts` - Exports focusTerminalWindow() and FocusResult interface
- `src/services/jumpService.ts` - Imports and uses focusTerminalWindow for non-tmux sessions

## Decisions Made

- **xdotool over wmctrl:** xdotool provides --pid search capability; wmctrl requires manual window ID lookup
- **windowactivate over windowfocus:** windowactivate handles desktop switching, more reliable
- **PID tracing first, title fallback:** More accurate than just title matching
- **App-level focus for macOS:** AppleScript activates Terminal.app; specific tab focus requires additional work
- **SetForegroundWindow with ShowWindowAsync:** SW_RESTORE (9) before SetForegroundWindow for minimized windows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Linux (X11):** Install xdotool for window focus capability:
```bash
sudo apt install xdotool
```

**macOS:** No additional setup (osascript is built-in)

**WSL2:** No additional setup (PowerShell and Windows Terminal are standard)

**Wayland users:** Window focus is not supported. Use tmux for session jumping or switch to X11 session.

## Next Phase Readiness

Phase 6 Plan 1 (Window Focus Service) is complete.

Remaining in Phase 6:
- None (this was the only plan in Phase 6)

The window focus feature is now integrated:
- Pressing Enter on a tmux session: tmux switch-client/attach-session
- Pressing Enter on a non-tmux session: platform-specific window focus

**Known limitations:**
- Wayland: Not supported (security restrictions prevent window manipulation)
- macOS: Focuses Terminal.app, not specific tab
- WSL2: Focuses Windows Terminal, not specific tab
- Multiple matching windows: First match is activated

---
*Phase: 06-terminal-integration*
*Completed: 2026-01-25*

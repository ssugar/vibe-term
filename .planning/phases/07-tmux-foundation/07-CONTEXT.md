# Phase 7: tmux Foundation - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

HUD runs inside a managed tmux session with proper environment for reliable rendering. User runs a single command and is placed into a tmux-managed environment with the HUD strip visible. Creating/managing Claude session panes is Phase 9-10.

</domain>

<decisions>
## Implementation Decisions

### Tool Renaming
- Rename tool from `cc-tui-hud` to `claude-terminal`
- Command: `claude-terminal`
- tmux session name: `claude-terminal`
- Config path: `~/.config/claude-terminal/`

### Session Naming & Identity
- Fixed session name: `claude-terminal`
- Name-only identification (no marker env vars)
- If session named `claude-terminal` already exists, attach to it regardless of origin
- If user is in a different tmux session, use `switch-client` to move to `claude-terminal`

### Startup Behavior
- tmux required — error and exit with install instructions if unavailable
- From regular terminal: create `claude-terminal` session and attach automatically
- Multiple terminals can attach to same session (tmux default behavior)
- On quit (q key): prompt user — detach (keep session alive) or kill (cleanup completely)

### Pane Layout
- HUD position: user configurable, default to top
- HUD height: user configurable (1-3 lines), default to 2 lines
- Small terminal (<10 rows): show warning but proceed anyway

### Environment Setup
- Trust user's TERM — don't auto-detect or modify
- Full tmux setup within session: disable status bar, enable mouse, set up keybindings
- Override tmux options within `claude-terminal` session only (don't affect global config)
- Config file location: `~/.config/claude-terminal/config.json`

### Claude's Discretion
- Exact tmux options to set/override
- Warning message wording for small terminals
- Config file schema and defaults
- Error message formatting for missing tmux

</decisions>

<specifics>
## Specific Ideas

- Should feel seamless — user types `claude-terminal` and lands in a ready environment
- Quit prompt should be quick and unobtrusive (not a modal dialog, just a simple y/n)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-tmux-foundation*
*Context gathered: 2026-01-25*

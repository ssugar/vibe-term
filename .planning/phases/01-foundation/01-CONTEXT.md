# Phase 1: Foundation - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolding, types, basic Ink setup, Zustand stores. Establish infrastructure that all subsequent phases depend on. HUD launches with basic UI frame (header, empty list area, footer), runs cross-platform, exits cleanly.

</domain>

<decisions>
## Implementation Decisions

### UI Frame Layout
- Header displays title + status summary ("Claude Code HUD - 2 blocked, 3 working")
- Footer displays key hints + refresh indicator ("j/k: navigate • enter: select • q: quit • ?: help" + "Updated 2s ago")
- Empty state shows ASCII art + helpful message ("No Claude sessions" + hint to start claude)
- Box borders using Unicode box-drawing characters around sections

### Color Scheme & Styling
- Dark mode focus — colors chosen for dark terminal backgrounds
- Blocked sessions: Bold text + red indicator (more noticeable than color alone)
- Selected row: Inverse colors (background/foreground swap, classic terminal selection)

### Exit Behavior
- Always confirm before quitting (prompt "Quit HUD?")
- Ctrl+C: First press shows warning, second press force quits
- Errors display as persistent banner until dismissed or resolved
- Silent exit — no message on quit, return directly to shell prompt

### Refresh Rate
- Poll interval configurable via --refresh flag, default 2 seconds
- Refresh indicator shows relative time ("Updated 2s ago") in footer
- Balanced resource usage — reasonable efficiency without sacrificing features

### Claude's Discretion
- Specific status colors for dark mode readability (stoplight vs blue-accent)
- Redraw strategy (on change vs every poll) — whatever works best with Ink/React
- ASCII art design for empty state
- Exact spacing and typography within frame
- Error banner dismiss mechanism

</decisions>

<specifics>
## Specific Ideas

- Box borders give classic TUI aesthetic — think htop, lazygit
- Inverse color selection is familiar to terminal users
- Two-stage Ctrl+C prevents accidental exits while allowing emergency escape

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-01-22*

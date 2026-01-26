# Phase 8: HUD Strip UI - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Transform the full-screen session list into a compact horizontal tab strip (1-2 lines) that displays all sessions with status and context indicators. This is the UI transformation only — pane switching and session lifecycle are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Tab Content & Format
- Tab format: `[index:name status context%]` with brackets
- Project name: Last directory only (not full path)
- Name truncation: Max 20 characters + ellipsis for long names
- Context percentage: Always visible in every tab

### Visual Distinction
- Selected session: Inverted colors (foreground/background swap)
- Blocked sessions: Red background + bold text — unmissable
- Status icons: Emoji — ⏳ (Working), ✅ (Idle), 🛑 (Blocked) — consistent with v1.0
- Context percentage: Color-coded (green/yellow/red based on value)

### Overflow Handling
- Overflow strategy: Scroll with ◀ ▶ arrows when tabs exceed width
- Blocked sessions: Always pinned/visible even when scrolled
- Navigation: Arrow keys (left/right) scroll the tab bar
- Expected usage: 5-10 sessions typical, overflow will happen regularly

### Layout Density
- Line count: Adaptive — 1 line normally, 2 lines when needed
- Second line triggers: Help mode (? key) OR error/warning messages
- Tab spacing: Double space between tabs for readability
- Separator: Subtle background color distinguishes HUD strip from main pane

### Claude's Discretion
- Exact background colors for HUD strip and selected state
- Animation/transition when switching between 1-line and 2-line modes
- Exact arrow indicator styling for scroll
- How to truncate when even a single tab is too wide for terminal

</decisions>

<specifics>
## Specific Ideas

- Keep consistency with v1.0 emoji indicators (users already familiar)
- Blocked sessions should be impossible to miss — the core value prop is "never miss a blocked Claude"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-hud-strip-ui*
*Context gathered: 2026-01-26*

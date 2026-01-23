# Phase 3: Status Detection - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Parse JSONL logs to display accurate Working/Idle/Blocked status for each session with visual indicators and model type. Users see at a glance which sessions need attention.

</domain>

<decisions>
## Implementation Decisions

### Status Indicators
- Use action emojis: ✅ Idle / ⏳ Working / 🛑 Blocked
- Emoji only, no text label alongside
- Status indicator appears before project name (leftmost after index)
- Row layout: `[index] [status] [project] [duration] [model]`

### Blocked State Emphasis
- Blocked sessions sort to top of list, always
- Bold text + subtle red/pink background highlight for entire row
- Text color: white/default on red background for contrast
- The 🛑 emoji plus visual treatment makes blocked unmissable

### Model Display
- Show full model name: sonnet, opus, haiku
- Model appears at end of row (rightmost)
- If model unknown (can't parse logs): show "unknown" in dimmed text

### Status Update Behavior
- Use existing 2-second refresh interval (same as session detection)
- Instant swap when status changes, no transition effects
- No sound/bell notification for blocked - visual change is sufficient
- If log file unreadable: show "?" or dimmed indicator for unknown status

### Claude's Discretion
- Model name colors (whether to color-code sonnet/opus/haiku differently)
- Exact shade of red/pink for blocked row background
- Unknown status indicator design (? vs dimmed emoji vs other)

</decisions>

<specifics>
## Specific Ideas

- "Never miss a blocked Claude" is the core value - blocked emphasis is critical
- Blocked sorting to top ensures immediate visibility even with many sessions
- Action emojis (✅/⏳/🛑) are more expressive than circle emojis

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-status-detection*
*Context gathered: 2026-01-22*

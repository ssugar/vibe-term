# Phase 4: Context Window - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Display context window usage for each Claude session with stoplight color coding. Users see at a glance how much context each session has consumed. This phase does NOT include context management actions (clearing context, compaction, etc.) — only display.

</domain>

<decisions>
## Implementation Decisions

### Visual representation
- Progress bar + percentage displayed together
- Wide bar (20+ chars) — context is a primary focus of the HUD
- Position: End of row (Index | Status | Project | Duration | Model | Context)
- Unicode block characters (█▓▒░) for visually smooth progress bar
- Show absolute token counts if space allows: "45% (90k/200k)"

### Data source
- Claude's discretion on how to obtain context usage (hooks, JSONL, or other available data)
- Show 'N/A' or dash when context data unavailable for a session
- Use model-specific context limits (opus/sonnet/haiku have different windows)
- Percentage calculated against each model's actual context window size

### Threshold behavior
- Green: <30% usage
- Yellow: 30-70% usage
- Red: >70% usage
- Gradient within bar — color varies smoothly as it fills (green→yellow→red)
- Warning emoji (⚠️) added at 90%+ usage for critical alert
- Percentage text colored to match bar color (45% green, 65% yellow, 85% red)

### Update frequency
- Same refresh cycle as status updates (2 seconds)
- Context and status updates synchronized together
- No animation — bar updates instantly to new value
- Show stale indicator (dim or '?') if context data hasn't updated recently

### Claude's Discretion
- Exact data source for context usage (research what's available)
- Specific Unicode characters for bar rendering
- How to determine "stale" threshold
- Exact spacing and layout within the 20+ char bar width
- Gradient implementation approach in terminal

</decisions>

<specifics>
## Specific Ideas

- Context window is a primary HUD concern — "never miss a blocked Claude" includes knowing when context is running out
- Wide bar emphasizes importance of context visibility
- Gradient bar gives quick visual read on severity without needing to read numbers

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-context-window*
*Context gathered: 2026-01-23*

# Phase 16: CLI Polish - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add machine-readable JSON output mode to all CLI commands and implement contextual action suggestions that guide users to logical next steps. No new commands or functionality — polish existing setup, audit, and fix commands.

</domain>

<decisions>
## Implementation Decisions

### JSON Output Format
- Claude decides envelope structure (uniform wrapper vs direct data)
- Always include `errors[]` array field, empty when successful
- Include metadata: timestamp, vibe-term version, duration in all responses
- All output goes to JSON including warnings — stderr is silent in JSON mode

### Action Suggestions
- Suggestions appear inline with relevant output (not in a footer block)
- Highlighted action format: colored command text (e.g., → Run `vibe-term audit` to verify)
- Contextual only — show suggestions when there's an actionable next step (issues found, changes made)
- Use full command format: `vibe-term audit` not just `audit`

### Output Consistency
- Strict symbol vocabulary: ✓ success, ✗ error, ⚠ warning, • info
- Structured error format: `Error: [CATEGORY] message` (e.g., `Error: [FILE] Cannot read settings.json`)
- Standardized section headers using `## Header` style across all commands
- Strict color mapping: Green=success, Yellow=warning, Red=error, Cyan=info

### CI/Automation Mode
- Exit codes always consistent: 0=ok, 1=error, 2=abort (regardless of output mode)
- --json produces pure JSON only to stdout — no colors, spinners, or progress
- JSON includes `suggestions[]` array for next actions
- Claude decides prompt behavior in JSON mode (auto-skip vs fail on prompt)

### Claude's Discretion
- JSON envelope structure choice
- Interactive prompt behavior when --json is active

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-cli-polish*
*Context gathered: 2026-02-01*

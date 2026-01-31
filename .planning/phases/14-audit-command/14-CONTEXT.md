# Phase 14: Audit Command - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Scan ~/.claude/projects/ to discover Claude projects and detect hook conflicts with vibe-term's global hooks. Users can run `vibe-term audit` to see pass/warn/fail status per project, filter results, and get exit codes for CI integration.

</domain>

<decisions>
## Implementation Decisions

### Output presentation
- Table format with columns: project path, status symbol (✓/⚠/✗), issue summary
- Summary only in default mode — just status symbol and conflict count
- `--verbose` flag shows per-project breakdown after the table (lists each conflicting project with specific issues)
- Always show summary line at end: "Scanned N projects: X pass, Y warn, Z fail"

### Conflict classification
- **PASS (✓)**: Project has no local hooks (no .claude.json or no hooks section) — global hooks apply cleanly
- **WARN (⚠)**: Project has conflicts but vibe-term can auto-merge/fix them
- **FAIL (✗)**: Malformed settings — JSON parse errors or invalid structure that can't be safely modified
- Same event with different script = PASS (not a conflict — they can coexist)

### Scanning behavior
- Require global hooks installed before scanning — error if vibe-term hooks not in ~/.claude/settings.json with message "Run setup first"
- Warn user if ~/.claude/projects/ directory doesn't exist — yellow message, not an error
- Mark projects with unparseable settings.json as FAIL — counts toward exit code 1
- Claude's discretion on additional scan locations (cwd check, etc.)

### Filtering options
- `--fail-only` flag to show only failures (hides pass and warn)
- Positional argument for single project: `vibe-term audit /path/to/project`
- Single project lookup derives projects/ path from given directory (not .claude.json check)
- Glob pattern support: `vibe-term audit "**/my-app*"` matches project paths

### Claude's Discretion
- Exact table column widths and truncation
- Additional scan locations beyond projects/
- How verbose mode formats the per-project breakdown
- Glob pattern implementation details

</decisions>

<specifics>
## Specific Ideas

- Exit code 0 when all clean, exit code 1 when any failures found (CI-friendly)
- The conflict classification prioritizes "can we fix it?" over "does it have hooks?"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-audit-command*
*Context gathered: 2026-01-31*

# Phase 15: Fix Command - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

CLI command to fix hook conflicts with intelligent merging that preserves existing hooks. Users can preview changes with dry-run (default), then apply with `--apply`. Supports fixing all conflicting projects or targeting specific paths.

</domain>

<decisions>
## Implementation Decisions

### Merge strategy
- Append vibe-term hooks (existing hooks run first, then vibe-term)
- If vibe-term hook already exists: skip with notice ("already configured")
- Offer two resolution modes per project:
  - Merge into project: copy vibe-term hooks directly into settings
  - Remove project override: delete project's hook section to inherit global
- When conflicting hooks exist (same event, different command): keep as separate array entries

### Dry-run output
- Show before/after format (not diff, not summary)
- For multiple projects: summary table first, then per-project details
- Only show projects that need changes (skip "no changes needed")
- Context scope: just the hooks section, not full settings file

### Error handling
- Continue to end on errors (try all projects, report all failures at end)
- Invalid JSON in settings: skip with warning, continue with others
- Auto-restore from backup if fix creates broken settings file
- Exit code 1 if ANY project failed

### Target selection
- No arguments: fix all conflicting projects (found by audit)
- Support glob patterns for project paths (e.g., `vibe-term fix 'projects/client-*'`)
- Confirm each project before applying (y/n prompt per project)
- `--yes` or `-y` flag to skip all confirmations

### Claude's Discretion
- Exact format of summary table
- Wording of confirmation prompts
- How to detect "broken" settings after write (validation approach)

</decisions>

<specifics>
## Specific Ideas

- The merge/inherit choice per project aligns with audit showing two conflict types: "hooks override global" vs "hooks conflict with vibe-term"
- Glob support mirrors how users think about project organization

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-fix-command*
*Context gathered: 2026-01-31*

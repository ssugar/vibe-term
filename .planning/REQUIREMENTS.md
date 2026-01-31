# Requirements: vibe-term v3.0

**Defined:** 2026-01-30
**Core Value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.

## v3.0 Requirements

Requirements for Hook Management & Distribution. Each maps to roadmap phases.

### Setup Command

- [ ] **SETUP-01**: User can run `vibe-term setup` to install global hooks
- [ ] **SETUP-02**: Setup creates ~/.vibe-term/ directory with hooks script
- [ ] **SETUP-03**: Setup backs up existing ~/.claude/settings.json before modification
- [ ] **SETUP-04**: Setup is idempotent (safe to run multiple times)
- [ ] **SETUP-05**: Setup shows clear success/failure output with colored status
- [ ] **SETUP-06**: Setup shows what files were changed
- [ ] **SETUP-07**: Setup supports `--yes` flag for non-interactive mode

### Audit Command

- [ ] **AUDIT-01**: User can run `vibe-term audit` to scan for hook conflicts
- [ ] **AUDIT-02**: Audit discovers projects from ~/.claude/projects/ directory
- [ ] **AUDIT-03**: Audit shows pass/warn/fail status per project
- [ ] **AUDIT-04**: Audit shows count of issues found
- [ ] **AUDIT-05**: Audit returns exit code 0 for clean, 1 for issues found
- [ ] **AUDIT-06**: Audit lists specific conflicts found per project
- [ ] **AUDIT-07**: Audit filters to only show projects with conflicts
- [ ] **AUDIT-08**: Audit groups projects by conflict type

### Fix Command

- [ ] **FIX-01**: User can run `vibe-term fix` to preview hook fixes (dry-run)
- [ ] **FIX-02**: User can run `vibe-term fix --apply` to execute hook fixes
- [ ] **FIX-03**: Fix backs up project settings before modification
- [ ] **FIX-04**: Fix reports what would change before applying
- [ ] **FIX-05**: Fix merges hooks intelligently (add vibe-term alongside existing)
- [ ] **FIX-06**: User can fix a single project with `vibe-term fix /path/to/project`

### CLI/UX

- [ ] **CLI-01**: All commands use colored output (green/yellow/red)
- [ ] **CLI-02**: All commands use status symbols (checkmarks, X, warning)
- [ ] **CLI-03**: All commands support `--json` flag for machine-readable output
- [ ] **CLI-04**: Commands suggest next action after completion

### Distribution

- [ ] **DIST-01**: User can install with `npm install -g vibe-term`
- [ ] **DIST-02**: Binary entry point `vibe-term` works after global install
- [ ] **DIST-03**: Package includes proper `files` array for minimal install size
- [ ] **DIST-04**: Global install works without sudo on standard npm setup

### Documentation

- [ ] **DOCS-01**: GitHub README includes installation instructions
- [ ] **DOCS-02**: GitHub README documents setup/audit/fix commands
- [ ] **DOCS-03**: GitHub README explains hook management workflow

## v4.0 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Features

- **ADV-01**: Interactive setup wizard for first-time users
- **ADV-02**: Per-project fix confirmation prompts
- **ADV-03**: Session preview pane in HUD
- **ADV-04**: Cost/token tracking per session
- **ADV-05**: Subagent model breakdown display

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auto-fix without confirmation | Dangerous - config modification needs explicit consent |
| Complex merge strategies UI | Over-engineering - simple add-if-missing is sufficient |
| Backup management commands | Scope creep - users can manage backups manually |
| Hook editor/configurator | Complexity explosion - JSON editing is fine for power users |
| Watch mode for conflicts | Overkill - conflicts don't appear dynamically |
| Global undo command | Complex state tracking - backups are simpler |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | TBD | Pending |
| SETUP-02 | TBD | Pending |
| SETUP-03 | TBD | Pending |
| SETUP-04 | TBD | Pending |
| SETUP-05 | TBD | Pending |
| SETUP-06 | TBD | Pending |
| SETUP-07 | TBD | Pending |
| AUDIT-01 | TBD | Pending |
| AUDIT-02 | TBD | Pending |
| AUDIT-03 | TBD | Pending |
| AUDIT-04 | TBD | Pending |
| AUDIT-05 | TBD | Pending |
| AUDIT-06 | TBD | Pending |
| AUDIT-07 | TBD | Pending |
| AUDIT-08 | TBD | Pending |
| FIX-01 | TBD | Pending |
| FIX-02 | TBD | Pending |
| FIX-03 | TBD | Pending |
| FIX-04 | TBD | Pending |
| FIX-05 | TBD | Pending |
| FIX-06 | TBD | Pending |
| CLI-01 | TBD | Pending |
| CLI-02 | TBD | Pending |
| CLI-03 | TBD | Pending |
| CLI-04 | TBD | Pending |
| DIST-01 | TBD | Pending |
| DIST-02 | TBD | Pending |
| DIST-03 | TBD | Pending |
| DIST-04 | TBD | Pending |
| DOCS-01 | TBD | Pending |
| DOCS-02 | TBD | Pending |
| DOCS-03 | TBD | Pending |

**Coverage:**
- v3.0 requirements: 32 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 32

---
*Requirements defined: 2026-01-30*
*Last updated: 2026-01-30 after initial definition*

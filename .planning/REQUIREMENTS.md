# Requirements: vibe-term v3.0

**Defined:** 2026-01-30
**Core Value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.

## v3.0 Requirements

Requirements for Hook Management & Distribution. Each maps to roadmap phases.

### Setup Command

- [x] **SETUP-01**: User can run `vibe-term setup` to install global hooks
- [ ] **SETUP-02**: Setup creates ~/.vibe-term/ directory with hooks script
- [x] **SETUP-03**: Setup backs up existing ~/.claude/settings.json before modification
- [x] **SETUP-04**: Setup is idempotent (safe to run multiple times)
- [x] **SETUP-05**: Setup shows clear success/failure output with colored status
- [x] **SETUP-06**: Setup shows what files were changed
- [x] **SETUP-07**: Setup supports `--yes` flag for non-interactive mode

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
| SETUP-01 | Phase 13 | Complete |
| SETUP-02 | Phase 12 | Complete |
| SETUP-03 | Phase 13 | Complete |
| SETUP-04 | Phase 13 | Complete |
| SETUP-05 | Phase 13 | Complete |
| SETUP-06 | Phase 13 | Complete |
| SETUP-07 | Phase 13 | Complete |
| AUDIT-01 | Phase 14 | Pending |
| AUDIT-02 | Phase 14 | Pending |
| AUDIT-03 | Phase 14 | Pending |
| AUDIT-04 | Phase 14 | Pending |
| AUDIT-05 | Phase 14 | Pending |
| AUDIT-06 | Phase 14 | Pending |
| AUDIT-07 | Phase 14 | Pending |
| AUDIT-08 | Phase 14 | Pending |
| FIX-01 | Phase 15 | Pending |
| FIX-02 | Phase 15 | Pending |
| FIX-03 | Phase 15 | Pending |
| FIX-04 | Phase 15 | Pending |
| FIX-05 | Phase 15 | Pending |
| FIX-06 | Phase 15 | Pending |
| CLI-01 | Phase 12 | Complete |
| CLI-02 | Phase 12 | Complete |
| CLI-03 | Phase 16 | Pending |
| CLI-04 | Phase 16 | Pending |
| DIST-01 | Phase 17 | Pending |
| DIST-02 | Phase 17 | Pending |
| DIST-03 | Phase 17 | Pending |
| DIST-04 | Phase 17 | Pending |
| DOCS-01 | Phase 17 | Pending |
| DOCS-02 | Phase 17 | Pending |
| DOCS-03 | Phase 17 | Pending |

**Coverage:**
- v3.0 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-01-30*
*Last updated: 2026-01-30 after roadmap creation*

# Requirements: vibe-term

**Defined:** 2026-02-02
**Core Value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.

## v1.4 Requirements

Requirements for Session Lifecycle milestone. Each maps to roadmap phases.

### Kill Tab

- [ ] **KILL-01**: User can initiate kill on selected tab with `x` key
- [ ] **KILL-02**: User sees confirmation prompt before kill executes
- [ ] **KILL-03**: Session's tmux pane is terminated when kill confirmed
- [ ] **KILL-04**: Tab is removed from HUD strip after kill
- [ ] **KILL-05**: Session state files are cleaned up after kill
- [ ] **KILL-06**: User can kill the last remaining session (shows empty HUD)

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Usage Insights

- **USAGE-01**: Display subagent model breakdown (e.g., "+1 haiku, +2 sonnet")
- **USAGE-02**: Cost/token tracking per session

### Session Management

- **SESS-01**: Session preview pane (see content before switching)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Tab reordering | Not requested, adds complexity |
| Tab renaming | Not requested, adds complexity |
| Batch kill (multiple tabs) | Overkill for typical usage |
| Kill without confirmation | Safety concern, would need settings |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| KILL-01 | TBD | Pending |
| KILL-02 | TBD | Pending |
| KILL-03 | TBD | Pending |
| KILL-04 | TBD | Pending |
| KILL-05 | TBD | Pending |
| KILL-06 | TBD | Pending |

**Coverage:**
- v1.4 requirements: 6 total
- Mapped to phases: 0
- Unmapped: 6 ⚠️

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after initial definition*

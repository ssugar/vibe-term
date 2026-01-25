# Requirements: Claude Code TUI HUD

**Defined:** 2026-01-22
**Core Value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Session Detection

- [x] **SESS-01**: Display list of all running Claude Code instances
- [x] **SESS-02**: Show project path/directory for each session
- [x] **SESS-03**: Auto-refresh status with configurable polling interval (1-2 seconds)
- [x] **SESS-04**: Display session age/duration (how long running or blocked)

### Status Indicators

- [x] **STAT-01**: Detect Working state (Claude actively processing)
- [x] **STAT-02**: Detect Idle state (Claude waiting for next user input)
- [x] **STAT-03**: Detect Blocked state (Claude waiting for permission/input)
- [x] **STAT-04**: Display RAG color-coded status (Red=Blocked, Amber=Working, Green=Idle)
- [x] **STAT-05**: Highlight blocked sessions visually (bold, color emphasis)
- [x] **STAT-06**: Show model indicator for each session (sonnet/opus/haiku)

### Context Window

- [x] **CTXT-01**: Display context window usage percentage for each session
- [x] **CTXT-02**: Apply stoplight colors to context meter (Green <30%, Yellow 30-70%, Red >70%)

### Navigation

- [x] **NAV-01**: Navigate session list with keyboard (j/k or arrow keys)
- [x] **NAV-02**: Jump to selected session with Enter key
- [x] **NAV-03**: Quit HUD with q key
- [x] **NAV-04**: Display help/keybindings with ? key
- [x] **NAV-05**: Quick-jump to session by number (1-9 hotkeys)

### Terminal Integration

- [ ] **TERM-01**: Detect Claude instances running in tmux sessions
- [ ] **TERM-02**: Correlate tmux panes with Claude processes
- [ ] **TERM-03**: Switch focus to tmux pane when selecting a session (HUD keeps running)
- [ ] **TERM-04**: Detect Claude instances in non-tmux terminal windows
- [ ] **TERM-05**: Switch focus to non-tmux terminal windows where possible (HUD keeps running)

### Platform Support

- [ ] **PLAT-01**: Work on Linux (native)
- [ ] **PLAT-02**: Work on macOS
- [ ] **PLAT-03**: Work on WSL2

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Navigation

- **NAV-V2-01**: Filter/search sessions by name or project (/ key)
- **NAV-V2-02**: Project grouping (group sessions by directory)

### Advanced Features

- **ADV-01**: Session preview pane (see last message without switching)
- **ADV-02**: Cost tracking per session (via OpenTelemetry)
- **ADV-03**: Token usage breakdown (input/output/cache)
- **ADV-04**: Long-blocked alerts (visual/audio if blocked > N minutes)
- **ADV-05**: Notification aggregation

### Container Mode

- **CONT-01**: Launch new Claude sessions from HUD
- **CONT-02**: Manage sessions within HUD (stop/restart)
- **CONT-03**: Embedded terminal interaction

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full session output display | Clutters HUD; link to terminal instead |
| Session management (start/stop/kill) | Existing tools handle this; focus on monitoring |
| Log viewing/scrollback | clog, claude-code-viewer already exist |
| Configuration editing | Direct users to `claude config` command |
| Multi-machine monitoring | Massive complexity for MVP |
| Native Windows support | WSL2 is primary; native Windows deferred |
| Mobile/web interface | Terminal-only for v1 |
| Mouse-only interface | TUI users expect keyboard-first |
| Heavy animations | Performance overhead |
| Plugin/extension system | Premature abstraction |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAT-01 | Phase 1: Foundation | Complete |
| PLAT-02 | Phase 1: Foundation | Complete |
| PLAT-03 | Phase 1: Foundation | Complete |
| SESS-01 | Phase 2: Session Detection | Complete |
| SESS-02 | Phase 2: Session Detection | Complete |
| SESS-03 | Phase 2: Session Detection | Complete |
| SESS-04 | Phase 2: Session Detection | Complete |
| TERM-01 | Phase 2: Session Detection | Complete |
| TERM-02 | Phase 2: Session Detection | Complete |
| TERM-04 | Phase 2: Session Detection | Complete |
| STAT-01 | Phase 3: Status Detection | Complete |
| STAT-02 | Phase 3: Status Detection | Complete |
| STAT-03 | Phase 3: Status Detection | Complete |
| STAT-04 | Phase 3: Status Detection | Complete |
| STAT-05 | Phase 3: Status Detection | Complete |
| STAT-06 | Phase 3: Status Detection | Complete |
| CTXT-01 | Phase 4: Context Window | Complete |
| CTXT-02 | Phase 4: Context Window | Complete |
| NAV-01 | Phase 5: Navigation | Complete |
| NAV-02 | Phase 5: Navigation | Complete |
| NAV-03 | Phase 5: Navigation | Complete |
| NAV-04 | Phase 5: Navigation | Complete |
| NAV-05 | Phase 5: Navigation | Complete |
| TERM-03 | Phase 6: Terminal Integration | Pending |
| TERM-05 | Phase 6: Terminal Integration | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

---
*Requirements defined: 2026-01-22*
*Last updated: 2026-01-22 after roadmap creation*

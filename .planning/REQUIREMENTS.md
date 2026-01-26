# Requirements: Claude Code TUI HUD v2.0

**Defined:** 2026-01-25
**Core Value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.

## v2.0 Requirements

Requirements for Integrated Claude Terminal. Each maps to roadmap phases.

### tmux Integration

- [x] **TMUX-01**: HUD creates/attaches to managed tmux session on startup
- [x] **TMUX-02**: HUD runs in fixed-height top pane (2 lines)
- [ ] **TMUX-03**: Claude sessions run in bottom pane (main area)
- [ ] **TMUX-04**: Session switching uses native tmux pane operations
- [ ] **TMUX-05**: User can return to HUD view with `b` key
- [x] **TMUX-06**: Graceful error when launched outside tmux-capable environment

### HUD Strip UI

- [ ] **STRIP-01**: Sessions displayed as horizontal tabs
- [ ] **STRIP-02**: Each tab shows `[index:name status context%]`
- [ ] **STRIP-03**: Active/selected session visually indicated
- [ ] **STRIP-04**: Blocked sessions highlighted (color/bold)
- [ ] **STRIP-05**: Tab overflow handled gracefully (truncation or scroll indicator)

### Session Management

- [x] **SESS-01**: User can spawn new Claude session with `n` key
- [x] **SESS-02**: New session spawns in bottom pane with directory prompt
- [x] **SESS-03**: Externally-created tmux sessions running Claude are detected
- [x] **SESS-04**: Dead/orphaned sessions cleaned up automatically
- [x] **SESS-05**: Session list updates in real-time (existing polling)

### Navigation (Preserved from v1.0)

- [ ] **NAV-01**: Navigate sessions with j/k or arrow keys
- [ ] **NAV-02**: Quick-jump with 1-9 number keys
- [ ] **NAV-03**: Switch to session with Enter key
- [ ] **NAV-04**: Quit with q key
- [ ] **NAV-05**: Help overlay with ? key

## v3.0 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Features

- **ADV-01**: Session preview pane (see last message without switching)
- **ADV-02**: Cost tracking per session
- **ADV-03**: Token usage breakdown (input/output/cache)
- **ADV-04**: Long-blocked alerts (visual/audio)
- **ADV-05**: Subagent model breakdown display

### Additional Platforms

- **PLAT-01**: Non-tmux fallback mode (v1.0 standalone)
- **PLAT-02**: Native Windows support

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Embedded terminal (node-pty) | tmux splits are more reliable, per PROJECT.md |
| Fuzzy finding/search | Overkill for 5-10 sessions |
| Config files for layouts | Single-process sessions don't need complex layouts |
| Session persistence/resurrect | tmux-resurrect handles this already |
| Mouse interface | TUI users expect keyboard-first |
| Plugin system | Premature abstraction |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TMUX-01 | Phase 7 | Complete |
| TMUX-02 | Phase 7 | Complete |
| TMUX-03 | Phase 9 | Pending |
| TMUX-04 | Phase 9 | Pending |
| TMUX-05 | Phase 9 | Pending |
| TMUX-06 | Phase 7 | Complete |
| STRIP-01 | Phase 8 | Pending |
| STRIP-02 | Phase 8 | Pending |
| STRIP-03 | Phase 8 | Pending |
| STRIP-04 | Phase 8 | Pending |
| STRIP-05 | Phase 8 | Pending |
| SESS-01 | Phase 10 | Complete |
| SESS-02 | Phase 10 | Complete |
| SESS-03 | Phase 10 | Complete |
| SESS-04 | Phase 10 | Complete |
| SESS-05 | Phase 10 | Complete |
| NAV-01 | Phase 11 | Pending |
| NAV-02 | Phase 11 | Pending |
| NAV-03 | Phase 11 | Pending |
| NAV-04 | Phase 11 | Pending |
| NAV-05 | Phase 11 | Pending |

**Coverage:**
- v2.0 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-01-25*
*Last updated: 2026-01-25 after roadmap creation*

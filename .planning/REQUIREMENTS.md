# Requirements: Claude Code TUI HUD v2.0

**Defined:** 2026-01-25
**Core Value:** Never miss a blocked Claude. See everything at a glance, get to any Claude in one keypress — reliably.

## v2.0 Requirements

Requirements for Integrated Claude Terminal. Each maps to roadmap phases.

### tmux Integration

- [ ] **TMUX-01**: HUD creates/attaches to managed tmux session on startup
- [ ] **TMUX-02**: HUD runs in fixed-height top pane (2 lines)
- [ ] **TMUX-03**: Claude sessions run in bottom pane (main area)
- [ ] **TMUX-04**: Session switching uses native tmux pane operations
- [ ] **TMUX-05**: User can return to HUD view with `b` key
- [ ] **TMUX-06**: Graceful error when launched outside tmux-capable environment

### HUD Strip UI

- [ ] **STRIP-01**: Sessions displayed as horizontal tabs
- [ ] **STRIP-02**: Each tab shows `[index:name status context%]`
- [ ] **STRIP-03**: Active/selected session visually indicated
- [ ] **STRIP-04**: Blocked sessions highlighted (color/bold)
- [ ] **STRIP-05**: Tab overflow handled gracefully (truncation or scroll indicator)

### Session Management

- [ ] **SESS-01**: User can spawn new Claude session with `n` key
- [ ] **SESS-02**: New session spawns in bottom pane with directory prompt
- [ ] **SESS-03**: Externally-created tmux sessions running Claude are detected
- [ ] **SESS-04**: Dead/orphaned sessions cleaned up automatically
- [ ] **SESS-05**: Session list updates in real-time (existing polling)

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
| TMUX-01 | TBD | Pending |
| TMUX-02 | TBD | Pending |
| TMUX-03 | TBD | Pending |
| TMUX-04 | TBD | Pending |
| TMUX-05 | TBD | Pending |
| TMUX-06 | TBD | Pending |
| STRIP-01 | TBD | Pending |
| STRIP-02 | TBD | Pending |
| STRIP-03 | TBD | Pending |
| STRIP-04 | TBD | Pending |
| STRIP-05 | TBD | Pending |
| SESS-01 | TBD | Pending |
| SESS-02 | TBD | Pending |
| SESS-03 | TBD | Pending |
| SESS-04 | TBD | Pending |
| SESS-05 | TBD | Pending |
| NAV-01 | TBD | Pending |
| NAV-02 | TBD | Pending |
| NAV-03 | TBD | Pending |
| NAV-04 | TBD | Pending |
| NAV-05 | TBD | Pending |

**Coverage:**
- v2.0 requirements: 21 total
- Mapped to phases: 0
- Unmapped: 21 ⚠️

---
*Requirements defined: 2026-01-25*
*Last updated: 2026-01-25 after initial definition*

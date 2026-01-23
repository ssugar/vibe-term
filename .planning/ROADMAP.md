# Roadmap: Claude Code TUI HUD

## Overview

This roadmap delivers a terminal-based heads-up display for monitoring multiple Claude Code instances. Starting from project foundation and core infrastructure, we progressively build session detection, status parsing, context awareness, keyboard navigation, and terminal integration. Each phase delivers a coherent, testable capability that builds toward the core value: never miss a blocked Claude.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project scaffolding, types, basic Ink setup, Zustand stores
- [x] **Phase 2: Session Detection** - Detect running Claude instances and display session list
- [ ] **Phase 3: Status Detection** - Parse JSONL logs for Working/Idle/Blocked states
- [ ] **Phase 4: Context Window** - Display context window usage with stoplight colors
- [ ] **Phase 5: Navigation** - Keyboard navigation and session selection
- [ ] **Phase 6: Terminal Integration** - Jump to selected session in tmux or terminal

## Phase Details

### Phase 1: Foundation
**Goal**: Establish project infrastructure with cross-platform patterns that all subsequent phases depend on
**Depends on**: Nothing (first phase)
**Requirements**: PLAT-01, PLAT-02, PLAT-03
**Success Criteria** (what must be TRUE):
  1. HUD launches and renders basic UI frame (header, empty list area, footer)
  2. HUD runs without errors on Linux, macOS, and WSL2
  3. HUD exits cleanly with Ctrl+C (no orphan processes, no memory leak warnings)
  4. TypeScript compilation succeeds with strict mode
**Plans**: 3 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md — Project scaffolding, TypeScript config, Zustand store
- [x] 01-02-PLAN.md — UI components (Header, Footer, EmptyState, SessionList)
- [x] 01-03-PLAN.md — CLI entry point, graceful shutdown, integration verification

### Phase 2: Session Detection
**Goal**: Users see all running Claude Code instances with project identification and session duration
**Depends on**: Phase 1
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04, TERM-01, TERM-02, TERM-04
**Success Criteria** (what must be TRUE):
  1. HUD displays a list of all running Claude Code instances (tmux and non-tmux)
  2. Each session shows its project path/directory
  3. Each session shows how long it has been running
  4. Session list auto-refreshes every 1-2 seconds without manual action
  5. tmux sessions correctly correlate with their Claude processes
**Plans**: 3 plans in 3 waves

Plans:
- [x] 02-01-PLAN.md — Platform abstraction, process detection, tmux services
- [x] 02-02-PLAN.md — Session type extension, session builder, useSessions hook
- [x] 02-03-PLAN.md — SessionRow component, SessionList update, human verification

### Phase 3: Status Detection
**Goal**: Users see accurate Working/Idle/Blocked status for each session with visual indicators
**Depends on**: Phase 2
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04, STAT-05, STAT-06
**Success Criteria** (what must be TRUE):
  1. Working sessions display hourglass emoji indicator
  2. Idle sessions display green checkmark emoji indicator
  3. Blocked sessions display red stop sign emoji indicator with bold text and red row background
  4. Model type (sonnet/opus/haiku) displays for each session
  5. Status accurately reflects actual Claude state (validated by comparing HUD to actual session)
**Plans**: 3 plans in 3 waves

Plans:
- [ ] 03-01-PLAN.md — Log path service and status detector service
- [ ] 03-02-PLAN.md — Session builder integration with blocked-first sorting
- [ ] 03-03-PLAN.md — SessionRow UI update with status emoji, model, blocked highlighting

### Phase 4: Context Window
**Goal**: Users see context window usage at a glance with stoplight color coding
**Depends on**: Phase 3
**Requirements**: CTXT-01, CTXT-02
**Success Criteria** (what must be TRUE):
  1. Each session displays context window usage as a percentage
  2. Context meter shows green when usage is below 30%
  3. Context meter shows yellow when usage is 30-70%
  4. Context meter shows red when usage exceeds 70%
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Navigation
**Goal**: Users can navigate the session list and access help using keyboard shortcuts
**Depends on**: Phase 4
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05
**Success Criteria** (what must be TRUE):
  1. User can move selection up/down with j/k or arrow keys
  2. User can select a session with Enter key (selection is visually indicated)
  3. User can quit HUD with q key
  4. User can view keybindings help with ? key
  5. User can quick-jump to sessions 1-9 using number hotkeys
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Terminal Integration
**Goal**: Users can jump from HUD directly to a selected Claude session in their terminal
**Depends on**: Phase 5
**Requirements**: TERM-03, TERM-05
**Success Criteria** (what must be TRUE):
  1. Pressing Enter on a tmux session switches terminal focus to that tmux pane
  2. HUD continues running after jumping (does not exit)
  3. Non-tmux terminal windows receive focus where platform supports it
  4. Graceful error message if session no longer exists
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-01-22 |
| 2. Session Detection | 3/3 | Complete | 2026-01-22 |
| 3. Status Detection | 0/3 | Planned | - |
| 4. Context Window | 0/1 | Not started | - |
| 5. Navigation | 0/2 | Not started | - |
| 6. Terminal Integration | 0/2 | Not started | - |

---
*Roadmap created: 2026-01-22*
*Last updated: 2026-01-22*

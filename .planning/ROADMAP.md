# Roadmap: Claude Code TUI HUD

## Milestones

- v1.0 Standalone HUD - Phases 1-6 (shipped 2026-01-25)
- v2.0 Integrated Claude Terminal - Phases 7-11 (shipped 2026-01-30)
- **v3.0 Hook Management & Distribution** - Phases 12-17 (in progress)

## Phases

<details>
<summary>v1.0 Standalone HUD (Phases 1-6) - SHIPPED 2026-01-25</summary>

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project scaffolding, types, basic Ink setup, Zustand stores
- [x] **Phase 2: Session Detection** - Detect running Claude instances and display session list
- [x] **Phase 3: Status Detection** - Hooks-based Working/Idle/Blocked status with visual indicators
- [x] **Phase 4: Context Window** - Display context window usage with stoplight colors
- [x] **Phase 5: Navigation** - Keyboard navigation and session selection
- [x] **Phase 6: Terminal Integration** - Jump to selected session in tmux or terminal

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
**Plans**: 4 plans in 4 waves

Plans:
- [x] 03-01-PLAN.md — Log path service and status detector service (DEPRECATED: JSONL approach unreliable)
- [x] 03-02-PLAN.md — Session builder integration with blocked-first sorting (DEPRECATED: uses 03-01)
- [x] 03-03-PLAN.md — SessionRow UI update with status emoji, model, blocked highlighting
- [x] 03-04-PLAN.md — Hooks-based status detection (replaces JSONL approach)

### Phase 4: Context Window
**Goal**: Users see context window usage at a glance with stoplight color coding
**Depends on**: Phase 3
**Requirements**: CTXT-01, CTXT-02
**Success Criteria** (what must be TRUE):
  1. Each session displays context window usage as a percentage
  2. Context meter shows green when usage is below 30%
  3. Context meter shows yellow when usage is 30-70%
  4. Context meter shows red when usage exceeds 70%
**Plans**: 2 plans in 2 waves

Plans:
- [x] 04-01-PLAN.md — Context service for JSONL parsing and percentage calculation
- [x] 04-02-PLAN.md — ContextMeter UI component and SessionRow integration

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
**Plans**: 2 plans in 2 waves

Plans:
- [x] 05-01-PLAN.md — Navigation keys (j/k/arrows, 1-9 hotkeys) and selection highlighting
- [x] 05-02-PLAN.md — Jump service and Enter key handler for tmux session switching

### Phase 6: Terminal Integration
**Goal**: Users can jump from HUD directly to a selected Claude session in their terminal
**Depends on**: Phase 5
**Requirements**: TERM-03, TERM-05
**Success Criteria** (what must be TRUE):
  1. Pressing Enter on a tmux session switches terminal focus to that tmux pane
  2. HUD continues running after jumping (does not exit)
  3. Non-tmux terminal windows receive focus where platform supports it
  4. Graceful error message if session no longer exists
**Plans**: 2 plans in 2 waves

Plans:
- [x] 06-01-PLAN.md — Window focus service for non-tmux sessions (Linux X11, macOS, WSL2)
- [x] 06-02-PLAN.md — HUD window save and 'b' key return-to-HUD functionality

</details>

<details>
<summary>v2.0 Integrated Claude Terminal (Phases 7-11) - SHIPPED 2026-01-30</summary>

**Milestone Goal:** Transform the standalone HUD into a tmux-integrated terminal where sessions run inside managed panes with an always-visible status strip.

- [x] **Phase 7: tmux Foundation** - Create/attach managed tmux session, HUD pane setup, environment verification
- [x] **Phase 8: HUD Strip UI** - Transform full-screen list to horizontal tab strip
- [x] **Phase 9: Pane Architecture** - Session panes, native tmux switching, return-to-HUD
- [x] **Phase 10: Session Lifecycle** - Spawn new sessions, detect external sessions, cleanup
- [x] **Phase 11: Navigation Integration** - Re-validate keyboard navigation in tmux context

### Phase 7: tmux Foundation
**Goal**: HUD runs inside a managed tmux session with proper environment for reliable rendering
**Depends on**: Phase 6 (v1.0 complete)
**Requirements**: TMUX-01, TMUX-02, TMUX-06
**Success Criteria** (what must be TRUE):
  1. User runs claude-terminal and is automatically placed in the claude-terminal tmux session
  2. HUD renders correctly in a 2-line fixed-height top pane
  3. Graceful error message displays when tmux is not available
  4. Running claude-terminal when already in claude-terminal session attaches to existing instance
**Plans**: 3 plans in 3 waves

Plans:
- [x] 07-01-PLAN.md — Startup infrastructure (tmux detection, config service)
- [x] 07-02-PLAN.md — CLI integration and session setup
- [x] 07-03-PLAN.md — Quit handler and verification

### Phase 8: HUD Strip UI
**Goal**: Users see all sessions as horizontal tabs with status and context in a compact 1-2 line display
**Depends on**: Phase 7
**Requirements**: STRIP-01, STRIP-02, STRIP-03, STRIP-04, STRIP-05
**Success Criteria** (what must be TRUE):
  1. Sessions display as horizontal tabs in format [index:name status context%]
  2. Active/selected session is visually distinct (highlighted)
  3. Blocked sessions are prominently indicated (color/bold)
  4. Tab overflow is handled gracefully when many sessions exist (truncation or indicator)
  5. HUD strip occupies minimal space (1-2 terminal lines)
**Plans**: 3 plans in 2 waves

Plans:
- [x] 08-01-PLAN.md — Foundation (useTerminalWidth hook, Tab component)
- [x] 08-02-PLAN.md — TabStrip component with scroll and overflow handling
- [x] 08-03-PLAN.md — App integration and visual verification

### Phase 9: Pane Architecture
**Goal**: Users can switch between sessions using native tmux pane operations and return to HUD with one keypress
**Depends on**: Phase 8
**Requirements**: TMUX-03, TMUX-04, TMUX-05
**Success Criteria** (what must be TRUE):
  1. Claude sessions run in the bottom pane (main terminal area)
  2. Pressing Enter on a session switches the bottom pane to that session
  3. User can return to HUD view with Ctrl+h from any pane
  4. Session switching is reliable (no focus confusion or input routing errors)
**Plans**: 3 plans in 3 waves

Plans:
- [x] 09-01-PLAN.md — Pane session manager and AppStore activeSessionId
- [x] 09-02-PLAN.md — Tab active marker, Ctrl+h binding, Enter key switching
- [x] 09-03-PLAN.md — Human verification of pane architecture

### Phase 10: Session Lifecycle
**Goal**: Users can spawn new Claude sessions and the HUD automatically manages session lifecycle
**Depends on**: Phase 9
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04, SESS-05
**Success Criteria** (what must be TRUE):
  1. User can spawn new Claude session with n key
  2. New session prompts for working directory and starts in bottom pane
  3. Externally-created tmux sessions running Claude appear in HUD
  4. Dead or orphaned sessions are automatically cleaned up
  5. Session list updates in real-time without manual refresh
**Plans**: 3 plans in 1 wave

Plans:
- [x] 10-01-PLAN.md — Directory service with tab completion and enhanced spawn mode
- [x] 10-02-PLAN.md — External session classification and divided tab display
- [x] 10-03-PLAN.md — Dead session detection and pane cleanup

### Phase 11: Navigation Integration
**Goal**: Keyboard navigation from v1.0 works correctly in the new tmux-integrated architecture
**Depends on**: Phase 10
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05
**Success Criteria** (what must be TRUE):
  1. User can navigate sessions with j/k or arrow keys
  2. User can quick-jump to sessions 1-9 with number keys
  3. User can switch to selected session with Enter key
  4. User can quit HUD with q key (cleans up tmux session properly)
  5. User can view help with ? key
**Plans**: 1 plan in 1 wave

Plans:
- [x] 11-01-PLAN.md — Fix selectedIndex bounds and validate navigation

</details>

### v3.0 Hook Management & Distribution (In Progress)

**Milestone Goal:** Make vibe-term easy to install and self-managing for Claude hooks. Users can install globally, set up hooks automatically, audit for conflicts, and fix them intelligently.

- [ ] **Phase 12: Foundation Services** - Core infrastructure for settings management and vibe-term directory
- [ ] **Phase 13: CLI Router & Setup Command** - Subcommand routing and global hook installation
- [ ] **Phase 14: Audit Command** - Project discovery and conflict detection
- [ ] **Phase 15: Fix Command** - Intelligent hook merging for conflict resolution
- [ ] **Phase 16: CLI Polish** - JSON output mode and action suggestions
- [ ] **Phase 17: Distribution & Documentation** - npm packaging and README updates

## Phase Details

### Phase 12: Foundation Services
**Goal**: Core services for file operations that all CLI commands depend on
**Depends on**: Phase 11 (v2.0 complete)
**Requirements**: SETUP-02, CLI-01, CLI-02
**Success Criteria** (what must be TRUE):
  1. vibeTermDirService can create ~/.vibe-term/ directory and install hook scripts
  2. settingsService can read/write/backup Claude settings.json files with error handling
  3. CLI output utilities support colored text (green/yellow/red) and status symbols
  4. Backup files use human-readable timestamps (settings.json.vibe-term-backup.TIMESTAMP)
**Plans**: TBD

### Phase 13: CLI Router & Setup Command
**Goal**: Users can run `vibe-term setup` to install global hooks with automatic backup
**Depends on**: Phase 12
**Requirements**: SETUP-01, SETUP-03, SETUP-04, SETUP-05, SETUP-06, SETUP-07
**Success Criteria** (what must be TRUE):
  1. User can run `vibe-term setup` to install hooks to ~/.claude/settings.json
  2. Running setup creates backup of existing settings before modification
  3. Running setup multiple times is safe (idempotent, no duplicate hooks)
  4. Setup displays colored success/failure output showing what files changed
  5. Setup supports `--yes` flag for non-interactive mode
**Plans**: TBD

### Phase 14: Audit Command
**Goal**: Users can discover all Claude projects and scan for hook conflicts
**Depends on**: Phase 13
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05, AUDIT-06, AUDIT-07, AUDIT-08
**Success Criteria** (what must be TRUE):
  1. User can run `vibe-term audit` to scan ~/.claude/projects/ for conflicts
  2. Audit shows pass/warn/fail status per project with colored output
  3. Audit lists specific conflicts found per project (e.g., "hooks override global")
  4. Audit returns exit code 0 when clean, 1 when conflicts found
  5. Audit can filter to only show projects with conflicts
**Plans**: TBD

### Phase 15: Fix Command
**Goal**: Users can fix hook conflicts with intelligent merging that preserves existing hooks
**Depends on**: Phase 14
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06
**Success Criteria** (what must be TRUE):
  1. User can run `vibe-term fix` to preview what would change (dry-run default)
  2. User can run `vibe-term fix --apply` to execute changes
  3. Fix creates backup before modifying any project settings
  4. Fix merges hooks intelligently (adds vibe-term alongside existing, no clobbering)
  5. User can fix a single project with `vibe-term fix /path/to/project`
**Plans**: TBD

### Phase 16: CLI Polish
**Goal**: CLI commands support machine-readable output and guide users to next steps
**Depends on**: Phase 15
**Requirements**: CLI-03, CLI-04
**Success Criteria** (what must be TRUE):
  1. All commands support `--json` flag for machine-readable output
  2. Setup suggests running audit after completion
  3. Audit with issues suggests running fix
  4. Fix suggests verifying with audit after applying
**Plans**: TBD

### Phase 17: Distribution & Documentation
**Goal**: Users can install vibe-term globally via npm and have clear documentation
**Depends on**: Phase 16
**Requirements**: DIST-01, DIST-02, DIST-03, DIST-04, DOCS-01, DOCS-02, DOCS-03
**Success Criteria** (what must be TRUE):
  1. User can install with `npm install -g vibe-term` without sudo
  2. `vibe-term` command works after global install (correct path resolution)
  3. Package includes only necessary files (minimal install size)
  4. README documents installation steps, setup/audit/fix commands, and hook workflow
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> ... -> 11 -> 12 -> 13 -> 14 -> 15 -> 16 -> 17

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-01-22 |
| 2. Session Detection | v1.0 | 3/3 | Complete | 2026-01-22 |
| 3. Status Detection | v1.0 | 4/4 | Complete | 2026-01-23 |
| 4. Context Window | v1.0 | 2/2 | Complete | 2026-01-25 |
| 5. Navigation | v1.0 | 2/2 | Complete | 2026-01-25 |
| 6. Terminal Integration | v1.0 | 2/2 | Complete | 2026-01-25 |
| 7. tmux Foundation | v2.0 | 3/3 | Complete | 2026-01-26 |
| 8. HUD Strip UI | v2.0 | 3/3 | Complete | 2026-01-26 |
| 9. Pane Architecture | v2.0 | 3/3 | Complete | 2026-01-26 |
| 10. Session Lifecycle | v2.0 | 3/3 | Complete | 2026-01-26 |
| 11. Navigation Integration | v2.0 | 1/1 | Complete | 2026-01-30 |
| 12. Foundation Services | v3.0 | 0/TBD | Not started | - |
| 13. CLI Router & Setup | v3.0 | 0/TBD | Not started | - |
| 14. Audit Command | v3.0 | 0/TBD | Not started | - |
| 15. Fix Command | v3.0 | 0/TBD | Not started | - |
| 16. CLI Polish | v3.0 | 0/TBD | Not started | - |
| 17. Distribution & Docs | v3.0 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-01-22*
*v2.0 phases added: 2026-01-25*
*v2.0 complete: 2026-01-30*
*v3.0 phases added: 2026-01-30*

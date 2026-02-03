# Roadmap: Claude Code TUI HUD

## Milestones

- v1.1 Standalone HUD - Phases 1-6 (shipped 2026-01-25)
- v1.2 Integrated Claude Terminal - Phases 7-11 (shipped 2026-01-30)
- v1.3 Hook Management & Distribution - Phases 12-17 (shipped 2026-02-02)
- v1.4 Session Lifecycle - Phase 18 (active)

## Phases

<details>
<summary>v1.1 Standalone HUD (Phases 1-6) - SHIPPED 2026-01-25</summary>

- [x] Phase 1: Foundation (3 plans)
- [x] Phase 2: Session Detection (3 plans)
- [x] Phase 3: Status Detection (4 plans)
- [x] Phase 4: Context Window (2 plans)
- [x] Phase 5: Navigation (2 plans)
- [x] Phase 6: Terminal Integration (2 plans)

**Archive:** `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>v1.2 Integrated Claude Terminal (Phases 7-11) - SHIPPED 2026-01-30</summary>

- [x] Phase 7: tmux Foundation (3 plans)
- [x] Phase 8: HUD Strip UI (3 plans)
- [x] Phase 9: Pane Architecture (3 plans)
- [x] Phase 10: Session Lifecycle (3 plans)
- [x] Phase 11: Navigation Integration (1 plan)

**Archive:** `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>v1.3 Hook Management & Distribution (Phases 12-17) - SHIPPED 2026-02-02</summary>

- [x] Phase 12: Foundation Services (2 plans)
- [x] Phase 13: CLI Router & Setup Command (2 plans)
- [x] Phase 14: Audit Command (2 plans)
- [x] Phase 15: Fix Command (2 plans)
- [x] Phase 16: CLI Polish (2 plans)
- [x] Phase 17: Distribution & Documentation (1 plan)

**Archive:** `.planning/milestones/v1.3-ROADMAP.md`

</details>

### v1.4 Session Lifecycle (Phase 18) - ACTIVE

- [ ] Phase 18: Session Termination

---

## Phase 18: Session Termination

**Goal:** User can safely terminate Claude sessions from the HUD

**Requirements:** KILL-01, KILL-02, KILL-03, KILL-04, KILL-05, KILL-06

**Dependencies:** Phase 8 (HUD Strip UI), Phase 9 (Pane Architecture), Phase 10 (Session Lifecycle v1.2)

**Success Criteria:**

1. User presses `x` on selected tab and sees confirmation prompt with session info
2. User confirms kill and tab immediately disappears from HUD strip
3. Session's tmux pane terminates (verified with `tmux list-panes`)
4. Session state files removed from ~/.vibe-term/sessions/
5. User can kill last remaining session, resulting in empty HUD strip (no crash)

**Plans:** TBD

---

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.1 Standalone HUD | 1-6 | 16 | Complete | 2026-01-25 |
| v1.2 Integrated Terminal | 7-11 | 13 | Complete | 2026-01-30 |
| v1.3 Hook Management | 12-17 | 11 | Complete | 2026-02-02 |
| v1.4 Session Lifecycle | 18 | 0 | Planning | — |

**Total:** 17 phases shipped, 1 active, 40 plans shipped

---
*Roadmap created: 2026-01-22*
*v1.3 archived: 2026-02-02*
*v1.4 added: 2026-02-02*

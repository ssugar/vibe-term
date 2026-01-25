# Research Summary: v2.0 Integrated Claude Terminal

**Project:** Claude Code TUI HUD v2.0
**Domain:** tmux-integrated terminal manager for Claude Code sessions
**Researched:** 2026-01-25
**Overall Confidence:** HIGH

## Executive Summary

The v2.0 architecture represents a fundamental shift from standalone monitoring to tmux-integrated session management. Research across tmux session managers (tmuxinator, tmux-sessionx, t-smart-tmux-session-manager) reveals a clear pattern: successful terminal managers work *with* tmux conventions, not against them. The HUD strip (1-2 line always-visible status bar) combined with native tmux pane management provides the optimal architecture for Claude workflow monitoring.

The recommended approach uses **no new npm dependencies** beyond the existing v1.0 stack (Ink 6.x, Zustand, React 19). All tmux integration happens through CLI commands via the existing `execAsync()` pattern. This is the correct decision because: (1) no Node.js library fully wraps tmux's pane management APIs, (2) the pattern is already proven in v1.0 for session operations, and (3) it avoids the complexity of libraries like `node-tmux` (missing critical pane operations) or `stmux` (replaces tmux entirely, contradicting design goals).

The primary risks are tmux-specific edge cases: pane resizing breaking layout, input routing to wrong pane after focus switch, and nested tmux detection. These are all manageable with proper defensive coding patterns documented in PITFALLS.md. The architecture is sound and well-precedented in the tmux ecosystem.

## Key Findings

### Stack Additions (from STACK.md)

**No new dependencies required.** The v2.0 tmux-integrated architecture is accomplished entirely with:

**Core technologies (unchanged from v1.0):**
- **Ink 6.6.0**: React TUI framework — provides `<Box height={2}>` for HUD strip rendering
- **React 19.2.3**: UI layer — note v1.0 already resolved React 19 compatibility
- **Zustand 5.0.10**: State management — will add hudPaneId, sessionPaneTarget to store
- **ps-list 9.0.0**: Process detection — continues to work for external session discovery
- **execa latest**: Command execution — proven pattern for tmux CLI operations

**tmux integration:**
- All pane operations via tmux CLI commands: `split-window`, `send-keys`, `select-pane`, `resize-pane`, `swap-pane`
- Existing `execAsync()` in `platform.ts` handles all tmux interaction
- No wrapper libraries needed or recommended

**Rejected alternatives:**
- `node-tmux`: Missing split-window/pane operations, would require CLI fallback anyway
- `stmux`: Replaces tmux entirely, contradicts native tmux integration goal
- `node-pty`: Embedded terminal out of scope per PROJECT.md constraints

### Feature Landscape (from FEATURES.md)

**Must have (table stakes):**
- Session list display with status indicators — v1.0 has this, refactor to horizontal
- Keyboard navigation (j/k, 1-9) — v1.0 has this, unchanged
- Session switching via tmux — v1.0 partial, v2.0 improves reliability
- HUD persists after session switch — new requirement, core v2.0 value
- Graceful external session detection — v1.0 has this via process detection

**Should have (competitive differentiators):**
- Horizontal HUD strip (1-2 lines) — maximizes space for active Claude
- Always-visible status bar — like browser tabs, not modal popup
- Claude-specific status (working/idle/blocked) — v1.0 has this, preserve
- Context window meters — v1.0 has this, condense to percentage
- Spawn new sessions with `n` key — complete workflow without leaving HUD
- Return to HUD with `b` key — quick toggle between work and overview

**Defer (v3+):**
- Session preview pane — complexity without solving core problem
- Fuzzy finder — overkill for 5-10 sessions
- Session configuration files — over-engineering for Claude use case
- Custom keybinding configuration — standard conventions are sufficient

**Keybinding map:**
- `j/k` or arrows: navigate sessions (vim/tmux convention)
- `1-9`: quick select session (tmux window switching pattern)
- `Enter`: jump to selected session
- `n`: spawn new Claude session (tmux-sessionist pattern)
- `b`: return to HUD (custom, mnemonic for "back")
- `q`: quit HUD
- `?`: toggle help (minimal, space is precious)

### Architecture Approach (from ARCHITECTURE.md)

**Integration pattern:** tmux becomes the container, HUD becomes a status layer. This inverts the v1.0 relationship where HUD was standalone and sessions were external.

**Target layout:**
```
tmux session: claude-hud
+----------------------------------------------------------------+
| [1:proj-a ⏳ 45%] [2:proj-b ✓ 12%] [3:proj-c 🛑 78%]            | <- HUD pane (2 lines, Ink)
+----------------------------------------------------------------+
|                                                                 |
|  Active Claude session pane (shell running Claude)              |
|                                                                 |
+----------------------------------------------------------------+
```

**Major components:**

1. **tmuxPaneManager Service** (new) — Manages tmux session/pane structure
   - Create claude-hud session on startup
   - Split window: HUD pane (top, 2 lines) + session pane (bottom, remaining)
   - Handle session switching in session pane
   - Spawn new Claude instances via `send-keys`

2. **HudStrip Component** (new) — Horizontal tab-style display
   - Replaces vertical SessionList from v1.0
   - Renders in 1-2 terminal rows
   - Format: `[1:proj-name ✓ 25%]` per tab
   - Handles terminal width detection and truncation

3. **Startup Orchestrator** (new) — Initialize tmux environment before Ink
   - Check if already in claude-hud session
   - Create/attach tmux session as needed
   - Start Ink app in HUD pane
   - Error if tmux not available

**Modified v1.0 components:**
- `App.tsx`: Remove overlays, change to horizontal strip layout, add `n`/`b` handlers
- `jumpService.ts`: Simplify to use tmuxPaneManager for switching
- `appStore.ts`: Add hudSessionName, sessionPaneTarget
- `Header.tsx`/`Footer.tsx`: Remove entirely (HUD strip is only visible element)

**Data flow patterns:**
- **Session discovery**: Unchanged — `useSessions` polls processes, builds session list
- **Session switching**: `tmuxPaneManager.switchToSession()` → `send-keys` to switch pane
- **New session**: User presses `n` → `spawnClaude(cwd)` → `send-keys -t session-pane "cd {cwd} && claude"`
- **Return to HUD**: User presses `b` (tmux binding) → `select-pane -t hud-pane`

### Critical Pitfalls (from PITFALLS.md)

1. **HUD Pane Resizing Breaks Layout** — Use fixed line count (`split-window -l 2`) not percentage. Listen for SIGWINCH and re-adjust with `resize-pane -y 2`. Test with aggressive terminal resizing.

2. **Input Goes to Wrong Pane After Focus Switch** — Known tmux bug where `pane-focus-in` triggers in wrong pane. Add 50-100ms delay after `select-pane`. Verify focus with `display-message -p '#{pane_id}'` before accepting input.

3. **Nested tmux Detection Fails Session Creation** — `$TMUX` environment variable prevents new sessions from child processes. Always detect `process.env.TMUX` before session operations. Use `switch-client` when inside tmux, not `attach` or `new-session`.

4. **send-keys Race Conditions** — Commands sent via `send-keys` can execute out of order or partially. Combine commands when possible (`cd /path && claude`). Add explicit delays between dependent operations. Avoid signal keys like Ctrl-Z.

5. **TERM Environment Breaks Ink Rendering** — tmux sets `TERM=screen` or `TERM=tmux-256color` which may break Ink colors/characters. Document required tmux config: `set-option -g default-terminal "tmux-256color"`. Verify TERM on startup and warn if incompatible.

**Additional moderate pitfalls:**
- Working directory confusion (always specify `-c` option)
- Dead panes after process exit (detect and clean during refresh)
- Pane ID instability (re-resolve before operations, never cache long-term)
- Terminal resize not propagated (listen to SIGWINCH + stdout resize)
- Keyboard input conflicts (implement focus-aware input routing)

## Recommended Build Order

Based on dependencies and integration points, implementation should proceed in waves:

### Phase 06-01: HUD Pane Foundation
**Rationale:** Establish the rendering and tmux environment before building session management
**Delivers:** Ink app runs in 2-line tmux pane with correct rendering
**Addresses:**
- TERM environment verification (Pitfall #5)
- Terminal resize handling (Pitfall #9)
- tmux version compatibility check (Pitfall #12)
- Multiple instance prevention (Pitfall #15)

**Components:**
- Startup orchestrator (check/create tmux session)
- HudStrip component skeleton (horizontal layout)
- Basic tmux pane creation (split-window -l 2)

**Research flag:** Standard patterns, skip phase research

### Phase 06-02: tmux Pane Architecture
**Rationale:** Build the pane management layer before interactive features
**Delivers:** tmuxPaneManager service with session/pane lifecycle
**Addresses:**
- Pane resizing resilience (Pitfall #1)
- Nested tmux detection (Pitfall #3)
- External session discovery (existing v1.0 pattern)

**Components:**
- tmuxPaneManager.ts service
- Session/pane creation logic
- Pane ID resolution (don't cache, re-query)

**Research flag:** Standard patterns, skip phase research

### Phase 06-03: Input Handling and Session Spawning
**Rationale:** Core interaction features depend on stable pane architecture
**Delivers:** Session switching, spawning, and keyboard navigation
**Addresses:**
- Input routing to correct pane (Pitfall #2)
- send-keys race conditions (Pitfall #4)
- Working directory handling (Pitfall #6)
- Keyboard input conflicts (Pitfall #10)

**Components:**
- Update jumpService.ts to use tmuxPaneManager
- Implement `n` key handler for new sessions
- Implement `b` key handler for return to HUD
- Focus verification before input handling

**Research flag:** Standard patterns, skip phase research

### Phase 06-04: UI Transformation and Polish
**Rationale:** Polish the UX after core mechanics are stable
**Delivers:** Complete horizontal HUD strip with tab display
**Addresses:**
- Session list to horizontal tabs refactor
- Status indicators in minimal format
- Terminal width handling and truncation

**Components:**
- Complete HudStrip.tsx and SessionTab.tsx
- Refactor App.tsx layout
- Remove Header.tsx, Footer.tsx
- Add visual polish (colors, selection indicators)

**Research flag:** Standard patterns, skip phase research

### Phase 06-05: Session Lifecycle and Cleanup
**Rationale:** Handle edge cases after happy path works
**Delivers:** Robust session management with cleanup
**Addresses:**
- Dead pane detection (Pitfall #7)
- Orphaned state cleanup (Pitfall #11)
- External session integration

**Components:**
- Dead pane cleanup in refresh cycle
- Startup orphan detection
- External session handling (show all with indicator)

**Research flag:** Standard patterns, skip phase research

### Phase Ordering Rationale

- **Foundation first:** Establish tmux environment and rendering before building features
- **Infrastructure before interaction:** Pane management must be stable before switching/spawning
- **Core mechanics before polish:** Get switching working before refining tab display
- **Edge cases last:** Handle cleanup and external sessions after happy path proven

This order avoids pitfalls by:
- Testing resize handling from the start (Pitfall #1)
- Verifying focus before building input features (Pitfall #2)
- Establishing nested tmux patterns before session operations (Pitfall #3)
- Building synchronization into send-keys from the start (Pitfall #4)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | No new dependencies, existing patterns proven in v1.0 |
| Features | **HIGH** | Well-established patterns across multiple tmux managers |
| Architecture | **HIGH** | tmux pane mechanics stable 20+ years, Ink rendering proven |
| Pitfalls | **HIGH** | Verified via GitHub issues, official docs, existing codebase |

**Overall confidence: HIGH**

All research areas are backed by authoritative sources (tmux man pages, GitHub official repos, verified issues). The v1.0 codebase provides proof-of-concept for Ink rendering and tmux integration. The only uncertainty is in user workflow preferences (external session handling), which requires feedback during implementation.

### Gaps to Address

**External session handling strategy** — How to handle Claude sessions in other tmux sessions (not claude-hud)?
- **Recommended:** Show all sessions with indicator, switch to their tmux session on select
- **Validate:** User testing will reveal if this is confusing vs helpful
- **Fallback:** Filter to only claude-hud sessions, provide toggle to show external

**Multiple HUD instance behavior** — What if user runs cc-tui-hud twice?
- **Recommended:** Attach to existing session (single source of truth)
- **Validate:** Does tmux attach-session work reliably from startup script?
- **Fallback:** Error with clear message about existing instance

**Return-to-HUD keybinding** — Should `b` be tmux binding or HUD input?
- **Recommended:** tmux global binding (`bind-key b select-pane -t hud-pane`)
- **Validate:** Can HUD safely modify user's tmux bindings?
- **Fallback:** Document manual tmux.conf addition, HUD only handles when focused

## Implications for Roadmap

The research strongly supports a 5-phase roadmap with clear dependencies:

1. **Phase 06-01 (HUD Pane Foundation)** delivers the rendering environment
2. **Phase 06-02 (tmux Pane Architecture)** builds the management layer
3. **Phase 06-03 (Input Handling)** enables interaction
4. **Phase 06-04 (UI Transformation)** completes the UX
5. **Phase 06-05 (Session Lifecycle)** handles edge cases

Each phase addresses specific pitfalls and builds on prior work. The architecture is sound, the stack is proven, and the implementation path is clear.

**Ready for roadmap: yes**

## Sources

### Primary (HIGH confidence)
- [tmux manual page](https://man7.org/linux/man-pages/man1/tmux.1.html) — Command reference
- [tmux GitHub](https://github.com/tmux/tmux) — Official repo, issues for known bugs
- [tmux FAQ](https://github.com/tmux/tmux/wiki/FAQ) — TERM settings, common issues
- [Ink GitHub](https://github.com/vadimdemedes/ink) — v6.6.0 features, React 19 compatibility
- [ps-list GitHub](https://github.com/sindresorhus/ps-list) — v9.0.0 requirements
- [Zustand GitHub](https://github.com/pmndrs/zustand) — v5.0.10 state management
- [execa GitHub](https://github.com/sindresorhus/execa) — Process execution patterns

### Secondary (MEDIUM confidence)
- [tmux-sessionx](https://github.com/omerxx/tmux-sessionx) — Session manager UX patterns
- [tmuxinator](https://github.com/tmuxinator/tmuxinator) — Project-based management
- [t-smart-tmux-session-manager](https://github.com/joshmedeski/t-smart-tmux-session-manager) — Smart create-or-attach
- [tmux-sessionist](https://github.com/tmux-plugins/tmux-sessionist) — Lightweight operations
- [Tao of Tmux](https://tao-of-tmux.readthedocs.io/) — Scripting patterns
- [tmux Advanced Use](https://github.com/tmux/tmux/wiki/Advanced-Use) — Pane targeting

### Tertiary (LOW confidence)
- [Super Guide to split-window](https://gist.github.com/sdondley/b01cc5bb1169c8c83401e438a652b84e) — Detailed patterns
- [TmuxAI guides](https://tmuxai.dev/) — Working directories, respawn
- [Baeldung tmux guides](https://www.baeldung.com/linux/tmux-status-bar-customization) — Configuration

### Verified from Codebase
- `src/services/tmuxService.ts` — Pane enumeration patterns
- `src/services/jumpService.ts` — Session switching patterns
- `src/hooks/useSessions.ts` — Process detection independent of tmux
- `src/services/platform.ts` — execAsync() pattern for tmux commands

---
*Research completed: 2026-01-25*
*Ready for roadmap: yes*

# Research Summary

**Project:** Claude Code TUI HUD
**Date:** 2026-01-22
**Overall Confidence:** HIGH

This research consolidates findings from stack selection, feature landscape analysis, architectural patterns, and known pitfalls to inform roadmap planning for a TUI-based heads-up display (HUD) that monitors multiple Claude Code instances.

---

## Executive Summary

Building a TUI to monitor multiple Claude Code instances requires solving a specific problem: **developers running multiple Claude Code sessions lose track of which ones are blocked and need attention.** The solution is a keyboard-driven dashboard that shows session status at a glance and enables quick navigation to blocked sessions.

The recommended approach uses **Ink (React for CLIs)** as the framework, leveraging its proven track record (Claude Code itself is built with Ink). Process detection combines **ps-list** for cross-platform process enumeration with **JSONL log parsing** (`~/.claude/projects/`) as the source of truth for session state. State management uses **Zustand** for its simplicity and ability to work outside React components. Terminal integration via **tmux** provides session navigation, with direct **execa** commands as fallback rather than relying on the unmaintained node-tmux library.

Key risks center on **performance** (polling intervals must balance responsiveness with CPU usage), **cross-platform compatibility** (Windows/WSL2 have different process detection capabilities), and **tmux integration fragility** (output parsing can break with version changes). Mitigation strategies include using established libraries (ps-list, cross-spawn), designing with graceful fallbacks, and validating on all target platforms early.

---

## Stack Recommendation

### Core Technologies

| Component | Choice | Version | Rationale |
|-----------|--------|---------|-----------|
| **Framework** | Ink | 6.6.0 | React mental model, proven in Claude Code, built-in focus management |
| **Runtime** | Node.js | >= 20 | Required by ps-list 9.x and Ink 6.x |
| **React** | React | 18.x | Ink 6.x incompatible with React 19 |
| **Module System** | ESM | Required | All core dependencies are ESM-only |
| **UI Components** | @inkjs/ui | Latest | Official Ink companion library with Spinner, Badge, ProgressBar |
| **State Management** | Zustand | 5.x | Works outside React, minimal boilerplate, subscribable |
| **Process Detection** | ps-list | 9.0.0 | Cross-platform, by Sindre Sorhus, no native deps |
| **Command Execution** | execa | Latest (9.x) | Promise-based, cross-platform shell execution |
| **Platform Detection** | is-wsl | Latest | Detects WSL1/WSL2 for platform-specific logic |
| **Colors** | Chalk | 5.6.2 | Industry standard, but Ink has built-in colors (use sparingly) |
| **TypeScript** | typescript | 5.x | Full Ink support, better DX for complex state |
| **Dev Execution** | tsx | Latest | Run TypeScript directly during development |

### Package Installation

```bash
# Core dependencies
npm install ink@6 react@18 @inkjs/ui zustand ps-list execa is-wsl chalk

# Dev dependencies
npm install -D typescript @types/react tsx
```

### Critical Stack Constraints

1. **ESM-only project** - All dependencies require ES modules
2. **Node.js 20+ locked** - ps-list 9.x minimum requirement
3. **React 18.x locked** - Cannot use React 19 until Ink supports it
4. **Avoid node-tmux** - No releases, limited activity; use execa with tmux CLI directly

---

## Table Stakes Features

These features are expected in any TUI process monitor. Users will consider the product incomplete without them.

| Feature | Priority | Complexity |
|---------|----------|------------|
| **Session list with status** | Must-have | Low |
| **Status indicators** (Working/Idle/Blocked) | Must-have | Medium |
| **Keyboard navigation** (j/k or arrows) | Must-have | Low |
| **Jump to session** (Enter key) | Must-have | Low |
| **Auto-refresh/polling** | Must-have | Low |
| **Visual hierarchy/layout** | Must-have | Low |
| **Color-coded status** (RAG: Red/Amber/Green) | Must-have | Low |
| **Session identification** (project path or name) | Must-have | Low |
| **Quit command** (q key) | Must-have | Low |
| **Help/keybinding display** | Must-have | Low |

### Status Detection Requirements

Based on GitHub Issue #2654, the core problem is detecting three states:

- **Working:** Claude is actively processing (API calls, tool execution)
- **Idle:** Claude completed response, waiting for next user input (normal state)
- **Blocked:** Claude is waiting for user input (permission prompts, AskUserQuestion, interrupts)

**Data sources:**
1. **Session JSONL logs** - `~/.claude/projects/<dir>/<session>.jsonl` (Primary)
2. **Notification hooks** (v1.0.38+) - Most reliable for blocked state
3. **OpenTelemetry events** - `claude_code.tool_decision`, `claude_code.user_prompt`
4. **Process monitoring** - Active/inactive process state (Fallback)

---

## Differentiating Features

These features solve the unique multi-session problem and set this HUD apart.

| Feature | Value | Complexity | Priority |
|---------|-------|------------|----------|
| **Context window usage meter** | See token consumption at glance; stoplight colors (Green <50%, Yellow 50-80%, Red >80%) | Medium | Phase 2 |
| **"Blocked" session highlighting** | Immediately identify sessions needing attention (flashing/bold/color) | Low | Phase 1 |
| **Quick-jump hotkeys** (1-9) | Jump to session by number without navigating | Low | Phase 2 |
| **Session preview pane** | See last message/question without switching | Medium | Phase 2 |
| **Notification aggregation** | Single place for all "needs attention" events | Medium | Phase 3 |
| **tmux/terminal integration** | Auto-detect and navigate to actual terminal window | High | Phase 1 |
| **Session age/duration** | See how long session running/blocked | Low | Phase 2 |
| **Cost tracking per session** | Show cumulative cost ($) via OpenTelemetry | Medium | Phase 3 |
| **Token usage breakdown** | Input/output/cache tokens per session | Medium | Phase 3 |
| **Model indicator** | Show which model each session uses (sonnet/opus/haiku) | Low | Phase 2 |
| **Project grouping** | Group sessions by project directory | Low | Phase 2 |
| **Filter/search sessions** | Find session by name/project with `/` | Low | Phase 2 |
| **Alerts for long-blocked sessions** | Visual/audio alert if blocked > N minutes | Medium | Phase 3 |

### Features to Explicitly Avoid

- **Full session output display** - Clutters HUD; link to actual terminal instead
- **Input/command capability** - Scope creep; focus on monitoring, not terminal emulation
- **Session management** (start/stop/kill) - Existing tools handle this
- **Log viewing/scrollback** - `claude-code-log`, `clog` already exist
- **Configuration editing** - Direct users to `claude config` command
- **Multi-machine monitoring** - Massive complexity for MVP
- **Mouse-only interface** - TUI users expect keyboard-first
- **Heavy animations** - Performance overhead
- **Plugin/extension system** - Premature abstraction

---

## Architecture Approach

### Four-Layer Architecture

**Layer 1: Data Collection**
- **ProcessDetector** - Find Claude Code processes via ps-list
- **TmuxScanner** - Enumerate tmux sessions and correlate with processes
- **StatusParser** - Parse JSONL logs for session state (Working/Idle/Blocked)
- **ContextWindowParser** - Extract token usage for stoplight indicators

**Layer 2: State Management**
- **Zustand stores** - InstanceStore (sessions), SelectionStore (UI state), ConfigStore (preferences)
- **PollingManager** - Coordinate refresh intervals
- Stores accessible from both React components and data collection layer

**Layer 3: UI Component Layer**
- **Functional React components** with Ink hooks
- **useFocus/useFocusManager** for keyboard navigation
- **useInput** for keyboard handling
- **Box-based flexbox layout** for responsive terminal sizing
- Components: App, Header, Footer, InstanceList, InstanceRow, StatusIndicator, ContextMeter

**Layer 4: Infrastructure**
- **ProcessSpawner** - Safe child_process wrappers with timeouts
- **TmuxClient** - Execute tmux CLI commands via execa
- **TerminalJumper** - Navigate to specific tmux session
- **Logger** - Debug logging (not to stdout, would corrupt TUI)

### Data Flow Pattern

Unidirectional flow following React/Flux:

```
Polling Trigger (interval)
    |
    v
[ProcessDetector | TmuxScanner | StatusParser]
    |
    v
Data Aggregator (combines all sources)
    |
    v
Zustand Store (setInstances)
    |
    v
React Components (subscribe to store slices)
    |
    v
Ink Renderer (diff and render to TTY)
```

### Directory Structure

```
src/
  cli.tsx               # Entry point, argument parsing
  app.tsx               # Root component, layout
  components/           # UI components (Header, Footer, InstanceList, etc.)
  hooks/                # Custom React hooks (usePolling, useInstances, etc.)
  stores/               # Zustand stores (instanceStore, selectionStore, configStore)
  services/             # Data collection (processDetector, tmuxScanner, statusParser)
  infra/                # Platform abstractions (processSpawner, tmuxClient, terminalJumper)
  types/                # TypeScript interfaces
```

### Key Architectural Decisions

1. **Zustand over Context/Redux** - Works outside React, minimal boilerplate, selective subscriptions
2. **Polling-based, not event-driven** - Simpler, more reliable across platforms
3. **JSONL logs as primary source** - More reliable than process detection alone
4. **execa for tmux, not node-tmux** - Active maintenance, direct CLI control
5. **Focus management via Ink built-ins** - useFocus and useFocusManager handle navigation
6. **ESM-only with Node.js 20+** - Required by all modern dependencies

---

## Critical Pitfalls to Avoid

### 1. Performance Degradation from High-Frequency Re-renders

**Symptom:** UI becomes sluggish, high CPU usage, terminal flickering

**Cause:** Each state update triggers full re-render. Multiple data sources updating simultaneously queue renders.

**Prevention:**
- Use Ink's `<Static>` component for non-updating content
- Batch state updates rather than updating on every poll
- Use appropriate polling intervals (1-2 seconds, not 100ms)
- Leverage Zustand selectors to prevent unnecessary component re-renders

**Phase:** Foundation (Phase 1) - establish patterns early

---

### 2. Memory Leaks from Uncleared Timers

**Symptom:** Memory usage grows over time, "state update on unmounted component" warnings

**Cause:** setInterval and event subscriptions continue after component unmount

**Prevention:**
```typescript
useEffect(() => {
  const interval = setInterval(poll, 2000);
  const unsubscribe = watcher.subscribe(handler);

  return () => {
    clearInterval(interval);
    unsubscribe();
  };
}, []);
```

**Phase:** Foundation (Phase 1) - establish cleanup patterns in all hooks

---

### 3. Cross-Platform child_process.spawn Failures

**Symptom:** "spawn npm ENOENT" errors on Windows, works on Linux/macOS

**Cause:** Windows requires `shell: true` for scripts; path handling differs

**Prevention:**
- Use `cross-spawn` package throughout
- Or use `{ shell: isWindows }` option
- Never use `execSync` (blocks event loop)
- Always use async spawn with timeouts

**Phase:** Foundation (Phase 1) - abstract from start

---

### 4. WSL2-Specific Process Detection Issues

**Symptom:** Different behavior on WSL2 vs native Linux, performance issues

**Cause:** WSL2 is neither Windows nor Linux; PATH conflicts, filesystem performance varies

**Prevention:**
- Detect WSL2 explicitly: check `/proc/version` for "microsoft"
- Handle WSL-specific paths and behaviors
- Test on WSL2 separately from native Linux
- Document WSL2 limitations

**Phase:** Process Detection (Phase 3) - implement WSL2-specific logic

---

### 5. tmux Output Parsing Fragility

**Symptom:** Works locally, breaks with different tmux versions or locales

**Cause:** Parsing human-readable output instead of machine-readable formats

**Prevention:**
```bash
# Use format strings for structured output
tmux list-sessions -F "#{session_id}:#{session_name}:#{session_attached}"
tmux capture-pane -t "$session:$window.$pane" -p
```

**Phase:** Terminal Integration (Phase 4) - use format strings from start

---

### 6. Focus Management Complexity

**Symptom:** Keyboard shortcuts trigger wrong actions, focus jumps unexpectedly

**Cause:** Multiple components with `useInput` handling same keypress

**Prevention:**
- Use `useFocus` and `useFocusManager` explicitly
- Set `isActive: false` on `useInput` for unfocused components
- Design clear focus hierarchy upfront
- Implement visual focus indicators

**Phase:** UI Components (Phase 2) - design focus model early

---

### 7. Claude Code Instance Detection Unreliability

**Symptom:** HUD shows no instances when Claude is running, or wrong counts

**Cause:** Process names vary by installation/version; multiple processes per instance

**Prevention:**
- Parse JSONL logs as primary source: `~/.claude/projects/<project>/<session>.jsonl`
- Use process detection as secondary/fallback
- Match on multiple criteria (name, command line, working directory)
- Handle detection failures gracefully
- Log detection attempts for debugging

**Phase:** Process Detection (Phase 3) - multi-method detection

---

## Recommended Build Order

### Phase 1: Foundation (Data Collection & Core UI)
**Duration:** 1-2 weeks

**Build:**
1. TypeScript interfaces and types
2. ProcessSpawner with safe child_process wrappers
3. ProcessDetector using ps-list
4. Basic Ink setup (cli.tsx, app.tsx, Header, Footer)
5. Zustand InstanceStore with polling hook
6. Signal handlers for graceful shutdown

**Deliverable:** Can detect Claude processes and display in basic TUI

**Validates:**
- Cross-platform process detection works
- Ink rendering and cleanup patterns established
- Polling without memory leaks

---

### Phase 2: Session State Detection
**Duration:** 1-2 weeks

**Build:**
1. JSONL log parser for session state (Working/Idle/Blocked)
2. TmuxScanner for session enumeration
3. StatusParser to correlate process + JSONL data
4. InstanceList and InstanceRow components
5. StatusIndicator with RAG colors
6. Session age/duration calculation

**Deliverable:** TUI shows Claude sessions with accurate status and colors

**Validates:**
- Status detection logic works
- JSONL parsing reliable
- tmux correlation successful

---

### Phase 3: Navigation & Context Awareness
**Duration:** 1 week

**Build:**
1. Focus management with useFocus/useFocusManager
2. Keyboard navigation (j/k, arrows, Enter)
3. ContextWindowParser for token usage
4. ContextMeter component with stoplight colors
5. Quick-jump hotkeys (1-9)
6. SelectionStore for UI state

**Deliverable:** Can navigate sessions with keyboard and see context window usage

**Validates:**
- Focus system works correctly
- Context parsing reliable
- Keyboard shortcuts intuitive

---

### Phase 4: Terminal Integration
**Duration:** 1 week

**Build:**
1. TmuxClient with format string parsing
2. TerminalJumper for session navigation
3. Enter key wired to jump action
4. Graceful HUD exit before jump
5. Error handling for missing sessions

**Deliverable:** Press Enter to jump to selected Claude session in tmux

**Validates:**
- tmux integration stable
- Session navigation works
- Edge cases handled

---

### Phase 5: Power Features (Optional/Future)
**Duration:** 1-2 weeks

**Build:**
1. Session preview pane (split view)
2. Filter/search functionality
3. Project grouping
4. Model indicator
5. Notification aggregation
6. OpenTelemetry integration for cost/token tracking
7. Long-blocked alerts

**Deliverable:** Enhanced UX for power users

---

## Open Questions

These require validation during implementation:

### Technical Validation Needed

1. **JSONL log structure** - What fields are available? How do they map to status?
2. **ps-list Windows limitations** - What data is NOT available on Windows? How to work around?
3. **WSL2 process visibility** - Can WSL2 see Windows processes and vice versa?
4. **tmux version compatibility** - What's the minimum tmux version? Do format strings work consistently?
5. **Context window data source** - Where exactly is token usage data? In JSONL or requires OpenTelemetry?
6. **Notification hook format** - What does `interrupt_reason` actually contain?
7. **Terminal emulator detection** - Can we detect which terminal is running (iTerm2, GNOME Terminal, etc.)?

### UX Decisions

1. **Default polling interval** - 1 second? 2 seconds? Configurable?
2. **Blocked session urgency** - How to prioritize multiple blocked sessions?
3. **Layout for small terminals** - What's the minimum terminal size? How to handle 80x24?
4. **Color scheme** - Respect NO_COLOR? Custom themes?
5. **Error display** - How to show errors without disrupting UI?

### Platform Testing

1. **Native Windows support** - Is it worth supporting without WSL2?
2. **macOS Terminal.app** - Does session jumping work?
3. **Wayland** - Any specific issues?
4. **Screen vs tmux** - Support GNU screen?

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | All technologies verified via official sources; proven in production |
| **Features** | HIGH | Based on real user pain points (GitHub issues) and established TUI patterns |
| **Architecture** | HIGH | Patterns validated in similar projects (btop, k9s, lazydocker) |
| **Pitfalls** | MEDIUM-HIGH | Common issues well-documented; some Claude-specific concerns need validation |

### Known Gaps

1. **Claude Code JSONL log format** - Need to examine actual logs to finalize parsing logic
2. **Notification hook data structure** - Need to test with live hooks to see actual payload
3. **OpenTelemetry integration** - Unclear if users have OTel configured by default
4. **Windows native behavior** - Most research focused on Unix-like systems

### Research Sources Quality

- **Official documentation:** Ink, Node.js, Claude Code docs (HIGH confidence)
- **GitHub issues:** Real user problems and feature requests (HIGH confidence)
- **npm packages:** Verified versions and APIs (HIGH confidence)
- **Community tools:** clog, claude-code-viewer as reference implementations (MEDIUM confidence)
- **TUI reference tools:** btop, lazydocker, k9s as design patterns (HIGH confidence)

---

## Sources

### Official Documentation
- [Ink GitHub Repository](https://github.com/vadimdemedes/ink)
- [Ink v3 Release Notes](https://vadimdemedes.com/posts/ink-3)
- [ps-list GitHub](https://github.com/sindresorhus/ps-list)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [execa GitHub](https://github.com/sindresorhus/execa)
- [is-wsl GitHub](https://github.com/sindresorhus/is-wsl)
- [Chalk GitHub](https://github.com/chalk/chalk)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Code Monitoring](https://code.claude.com/docs/en/monitoring-usage)
- [Node.js Child Process Documentation](https://nodejs.org/api/child_process.html)

### GitHub Issues (Claude Code)
- [Issue #2654: Monitor multiple sessions](https://github.com/anthropics/claude-code/issues/2654)
- [Issue #12048: Notification matcher for waiting input](https://github.com/anthropics/claude-code/issues/12048)
- [Issue #11189: Interrupt/reason context to hooks](https://github.com/anthropics/claude-code/issues/11189)
- [Issue #13922: Configurable idle_prompt timeout](https://github.com/anthropics/claude-code/issues/13922)
- [Issue #3045: IME Issues in Claude Code](https://github.com/anthropics/claude-code/issues/3045)

### TUI Reference Tools
- [btop++](https://github.com/aristocratos/btop) - Modern system monitor
- [lazydocker](https://lazydocker.com/) - Docker TUI with keyboard navigation
- [k9s](https://k9scli.io/) - Kubernetes TUI patterns
- [tmuxwatch](https://github.com/steipete/tmuxwatch) - tmux session monitoring TUI

### Community Tools
- [clog](https://github.com/HillviewCap/clog) - Claude Code log viewer
- [claude-code-viewer](https://github.com/d-kimuson/claude-code-viewer) - Web-based session viewer
- [ClaudeCodeJSONLParser](https://github.com/amac0/ClaudeCodeJSONLParser)
- [claude-JSONL-browser](https://github.com/withLinda/claude-JSONL-browser)

### Technical References
- [Building Terminal Interfaces with Node.js](https://blog.openreplay.com/building-terminal-interfaces-nodejs/)
- [Ink v3 Advanced UI Components](https://developerlife.com/2021/11/25/ink-v3-advanced-ui-components/)
- [OpenCode TUI Architecture](https://deepwiki.com/sst/opencode/6.2-tui-components)
- [Ratatui Elm Architecture](https://ratatui.rs/concepts/application-patterns/the-elm-architecture/)
- [React Clean Architecture](https://alexkondov.com/full-stack-tao-clean-architecture-react/)
- [Zustand vs Jotai Comparison](https://jotai.org/docs/basics/comparison)
- [tmux Output Formatting](https://qmacro.org/blog/posts/2021/08/06/tmux-output-formatting/)
- [tmux Control Mode Wiki](https://github.com/tmux/tmux/wiki/Control-Mode)
- [Handling Memory Leaks in React](https://www.lucentinnovation.com/resources/technology-posts/handling-memory-leaks-in-react-for-optimal-performance)
- [Node.js Graceful Shutdown](https://dev.to/yusadolat/nodejs-graceful-shutdown-a-beginners-guide-40b6)
- [Preventing Command Injection](https://auth0.com/blog/preventing-command-injection-attacks-in-node-js-apps/)

---

## Ready for Requirements Definition

This research provides a solid foundation for roadmap creation. The stack is validated, features are prioritized, architectural patterns are proven, and critical pitfalls are identified with mitigation strategies. The recommended build order (4-5 phases) balances risk, dependencies, and testability.

**Next Steps:**
1. Create detailed phase specifications
2. Define acceptance criteria for each deliverable
3. Identify which phases need `/gsd:research-phase` for deeper technical research
4. Set up project structure based on recommended architecture

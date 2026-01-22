# Feature Landscape: Claude Code TUI HUD

**Domain:** TUI process monitoring / multi-session dashboard for Claude Code instances
**Researched:** 2026-01-22
**Confidence:** HIGH (based on official Claude Code docs, community tools, and established TUI patterns)

## Table Stakes

Features users expect in any TUI monitor. Missing = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Session list with status** | Core function - must see all sessions at glance | Low | Every monitor (htop, k9s, lazydocker) shows list of managed items |
| **Status indicators (working/idle/blocked)** | Without this, no value over alt-tabbing | Medium | Requires parsing session state; notification hooks help here |
| **Keyboard navigation (j/k or arrows)** | TUI users expect vim-style or arrow key nav | Low | Standard pattern in all successful TUIs (k9s, lazydocker, btop) |
| **Jump to session (Enter/select)** | Must be able to act on selected session | Low | Primary interaction pattern |
| **Auto-refresh/polling** | Static display useless for monitoring | Low | Standard 1-30 second intervals; manual refresh with `r` key |
| **Visual hierarchy/layout** | Information must be scannable | Low | Clear columns, proper alignment, consistent spacing |
| **Color-coded status** | RAG (Red/Amber/Green) is universal | Low | Blocked=Red, Working=Green, Idle=Yellow/Amber |
| **Session identification** | Must know which project/directory each session is | Low | Show project path or session name |
| **Quit command (q)** | Standard TUI exit pattern | Low | Universal expectation |
| **Help/keybinding display** | Users need to discover commands | Low | Footer bar or `?` key for help |

### Status Detection Requirements

Based on [GitHub Issue #2654](https://github.com/anthropics/claude-code/issues/2654), the core problem is detecting session state:

**Working:** Claude is actively processing (API calls, tool execution)
**Idle:** Claude completed response, waiting for next user input (normal state)
**Blocked:** Claude is waiting for user input via:
- Permission prompts (tool approval)
- AskUserQuestion (interactive questions)
- Interrupts

Data sources for detection:
1. **Notification hooks** (v1.0.38+) - Most reliable for blocked state
2. **Session JSONL logs** - `~/.claude/projects/<dir>/<session>.jsonl`
3. **OpenTelemetry events** - `claude_code.tool_decision`, `claude_code.user_prompt`
4. **Process monitoring** - Active/inactive process state

## Differentiators

Features that would set this HUD apart. Not expected, but solve the unique multi-session problem.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Context window usage meter** | See token consumption at a glance; know when compaction coming | Medium | Stoplight colors: Green (<50%), Yellow (50-80%), Red (>80%); Claude shows compaction ~80% |
| **"Blocked" session highlighting** | Immediately see which sessions need attention | Low | The core pain point - flashing/bold/color for blocked sessions |
| **Quick-jump hotkeys (1-9)** | Jump to session by number without navigating | Low | Power user feature; saves j/k repetition |
| **Session preview pane** | See last message/question without switching | Medium | Split-pane showing current state of selected session |
| **Notification aggregation** | Single place for all "needs attention" events | Medium | Replaces multiple terminal_bell notifications |
| **tmux/terminal integration** | Auto-detect and navigate to actual terminal window | High | Deep integration with tmux panes/windows; complex but high value |
| **Session age/duration** | See how long session has been running/blocked | Low | Useful for identifying stale sessions |
| **Cost tracking per session** | Show cumulative cost ($) for each session | Medium | Uses OpenTelemetry `claude_code.cost.usage` metric |
| **Token usage breakdown** | Input/output/cache tokens per session | Medium | Via OpenTelemetry `claude_code.token.usage` metric |
| **Model indicator** | Show which model each session uses | Low | sonnet/opus/haiku visible at glance |
| **Project grouping** | Group sessions by project directory | Low | Useful when running multiple sessions per project |
| **Filter/search sessions** | Find session by name/project with `/` | Low | Standard pattern (k9s, lazydocker use `/` for filter) |
| **Alerts for long-blocked sessions** | Visual/audio alert if session blocked > N minutes | Medium | Configurable threshold; helps ADHD users per [Issue #13922](https://github.com/anthropics/claude-code/issues/13922) |
| **Session history/timeline** | Mini-graph showing activity over time | High | btop-style sparkline of activity |

### Claude Code-Specific Value Adds

These leverage Claude Code's unique characteristics:

1. **Context Window Stoplight**
   - Green: 0-50% usage - plenty of room
   - Yellow: 50-80% usage - approaching compaction
   - Red: 80%+ usage - compaction imminent
   - Source: `/context` command data or token metrics

2. **Blocked Reason Display**
   - "Waiting for permission" (tool approval)
   - "Asked a question" (AskUserQuestion)
   - "Interrupted" (user ESC/Ctrl+C)
   - Source: Notification hooks with `interrupt_reason` per [Issue #11189](https://github.com/anthropics/claude-code/issues/11189)

3. **Smart Attention Priority**
   - Sort/highlight sessions by urgency
   - Questions > Permissions > Long idle > Recently active
   - Solves the "which tab needs me" problem

## Anti-Features

Things to deliberately NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full session output display** | HUD becomes cluttered; not the goal | Show only status summary; link to actual terminal for details |
| **Input/command capability** | Scope creep; becomes a terminal emulator | Focus on monitoring; jump to real session for interaction |
| **Session management (start/stop/kill)** | Out of scope; existing tools handle this | Read-only monitoring; let user manage sessions in their terminals |
| **Log viewing/scrollback** | Already exists: `claude-code-log`, `clog`, etc. | Link to or recommend existing tools for deep log analysis |
| **Configuration editing** | Complex, error-prone, not core value | Direct users to `claude config` command |
| **Multi-machine monitoring** | Massive complexity increase | Single-machine focus initially; consider later |
| **Chat/response display** | UI becomes too complex | Show last message as preview only, not full conversation |
| **Mouse-only interface** | TUI users expect keyboard-first | Support mouse as secondary, not required |
| **Heavy animations** | Performance overhead; distracting | Subtle updates only; respect `NO_COLOR` and reduced motion |
| **Plugin/extension system** | Premature abstraction | Build core well first; plugins add maintenance burden |
| **Custom themes (initially)** | Scope creep | Use sensible defaults; consider themes post-MVP |
| **WebSocket/network features** | Complexity; security concerns | Local-only monitoring |

### Complexity Traps to Avoid

1. **Don't try to "fix" Claude Code notifications** - The notification hook system exists; HUD aggregates, doesn't replace
2. **Don't duplicate OpenTelemetry infrastructure** - If user has OTel setup, don't rebuild; just visualize
3. **Don't handle session persistence** - Claude Code handles this; HUD is stateless viewer
4. **Don't become a terminal multiplexer** - tmux/screen exist; HUD complements, doesn't compete

## Feature Dependencies

```
                    Session Detection
                          |
            +-------------+-------------+
            |             |             |
       JSONL Parser   Hook Listener   OTel Reader
            |             |             |
            +-------------+-------------+
                          |
                    Session State
                          |
            +-------------+-------------+
            |             |             |
      Session List    Status Colors   Context Meter
            |             |             |
            +------+------+-------------+
                   |
              Main Display
                   |
        +----------+----------+
        |          |          |
    Keyboard    Preview    Jump-to
    Navigation   Pane      Session
```

### Dependency Chain

1. **Foundation Layer** (must build first)
   - Session detection (JSONL parsing, file watching)
   - Basic TUI framework setup
   - Keyboard event handling

2. **Core Display** (builds on foundation)
   - Session list widget
   - Status indicator logic
   - Color/styling system

3. **Enhanced Features** (builds on core)
   - Context window meter
   - Preview pane
   - Filtering/search

4. **Integration** (optional, builds on all above)
   - tmux integration
   - Notification aggregation
   - Cost tracking

## Complexity Assessment

### Low Complexity (1-2 days each)
- Session list display
- Keyboard navigation (j/k, arrows, Enter)
- Status color coding
- Auto-refresh polling
- Quick-jump hotkeys (1-9)
- Session age display
- Model indicator
- Help display
- Quit handling

### Medium Complexity (3-5 days each)
- Session state detection from JSONL
- Context window usage meter
- Session preview pane
- Cost tracking (requires OTel setup)
- Token breakdown display
- Notification hook integration
- Long-blocked alerts
- Filter/search

### High Complexity (1-2 weeks each)
- tmux pane/window integration
- Activity timeline/sparklines
- Multi-terminal navigation (VSCode terminals, iTerm, etc.)

## MVP Recommendation

For MVP, prioritize solving the core pain point: **"Which Claude session needs my attention?"**

### Phase 1: Minimum Viable HUD
1. Session list with project paths
2. Status indicators (Working/Idle/Blocked) - via JSONL watching
3. Color coding (Green/Yellow/Red)
4. Keyboard navigation (j/k/Enter)
5. Auto-refresh (5-second default)
6. Jump to session (open terminal/tmux pane)

### Phase 2: Context Awareness
1. Context window usage meter
2. Blocked reason display
3. Quick-jump hotkeys (1-9)
4. Session preview pane

### Phase 3: Power Features
1. Cost tracking
2. Token breakdown
3. Long-blocked alerts
4. Activity timeline

### Defer to Post-MVP
- Multi-machine monitoring
- Custom themes
- Plugin system
- Deep terminal emulator integrations beyond tmux

## Sources

### Official Documentation
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Code Monitoring](https://code.claude.com/docs/en/monitoring-usage)
- [Claude Context Windows](https://docs.claude.com/en/docs/build-with-claude/context-windows)

### GitHub Issues (Claude Code)
- [Issue #2654: Monitor multiple sessions](https://github.com/anthropics/claude-code/issues/2654) - Core feature request
- [Issue #12048: Notification matcher for waiting input](https://github.com/anthropics/claude-code/issues/12048)
- [Issue #11189: Interrupt/reason context to hooks](https://github.com/anthropics/claude-code/issues/11189)
- [Issue #13922: Configurable idle_prompt timeout](https://github.com/anthropics/claude-code/issues/13922)

### TUI Reference Tools
- [btop++](https://github.com/aristocratos/btop) - Modern system monitor
- [lazydocker](https://lazydocker.com/) - Docker TUI with keyboard navigation
- [k9s](https://k9scli.io/) - Kubernetes TUI patterns
- [tmuxwatch](https://github.com/steipete/tmuxwatch) - tmux session monitoring TUI

### Community Tools
- [clog](https://github.com/HillviewCap/clog) - Claude Code log viewer with real-time monitoring
- [claude-code-viewer](https://github.com/d-kimuson/claude-code-viewer) - Web-based session viewer

### Design Patterns
- [awesome-tuis](https://github.com/rothgar/awesome-tuis) - TUI project list
- [Bubble Tea tips](https://leg100.github.io/en/posts/building-bubbletea-programs/) - Go TUI patterns
- [RAG Status Best Practices](https://www.clearpointstrategy.com/blog/establish-rag-statuses-for-kpis) - Traffic light status patterns

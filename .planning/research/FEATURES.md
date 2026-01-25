# Features Research: v2.0 Integrated Terminal

**Domain:** tmux-integrated terminal managers
**Researched:** 2026-01-25
**Confidence:** HIGH (patterns well-established across multiple tools)

## Executive Summary

Research into tmux session managers (tmuxinator, tmux-sessionx, t-smart-tmux-session-manager, tmux-sessionist) reveals consistent UX patterns for integrated terminal management. The v2.0 HUD strip architecture aligns well with established conventions, with number-key switching being a natural extension of tmux's built-in window navigation.

Key insight: Users expect session managers to work *with* tmux conventions, not replace them. The HUD should feel like a tmux enhancement, not a separate application.

## Table Stakes

Features users expect from any tmux-integrated terminal manager. Missing these = product feels incomplete.

### Session List Display

| Feature | Why Expected | Complexity | Existing v1.0? |
|---------|--------------|------------|----------------|
| List all sessions | Core function of any manager | Low | Yes |
| Session name/project visible | Identity at a glance | Low | Yes |
| Status indicator (working/idle/blocked) | Know what needs attention | Medium | Yes |
| Current selection highlight | Know where you are | Low | Yes |

**Sources:** [tmux-sessionx](https://github.com/omerxx/tmux-sessionx), [tmuxinator](https://github.com/tmuxinator/tmuxinator)

### Navigation

| Feature | Why Expected | Complexity | Existing v1.0? |
|---------|--------------|------------|----------------|
| j/k or arrow navigation | Universal vim/tmux convention | Low | Yes |
| Number keys 1-9 for quick select | tmux convention (`C-b 0-9`) | Low | Yes |
| Enter to switch/jump | Universal action key | Low | Yes |
| Quit with q | Universal convention | Low | Yes |

**Sources:** [tmux shortcuts cheatsheet](https://gist.github.com/MohamedAlaa/2961058), [tmux cheatsheet](https://tmuxcheatsheet.com/)

### Session Switching

| Feature | Why Expected | Complexity | Existing v1.0? |
|---------|--------------|------------|----------------|
| Switch to tmux session | Core value proposition | Low | Yes (partial) |
| HUD continues running after switch | Don't lose overview | Medium | No |
| Return to HUD easily | Get back to overview | Medium | No |
| Graceful error on missing session | Sessions can die | Low | Yes |

**Sources:** [t-smart-tmux-session-manager](https://github.com/joshmedeski/t-smart-tmux-session-manager), [tmux-sessionist](https://github.com/tmux-plugins/tmux-sessionist)

### tmux Integration Conventions

| Feature | Why Expected | Complexity | Existing v1.0? |
|---------|--------------|------------|----------------|
| Works inside tmux | Users run in tmux | Low | Yes |
| `switch-client` for in-tmux switching | Standard tmux pattern | Low | Yes |
| Respect tmux's `detach-on-destroy` setting | Don't surprise users | Low | No |

**Note on `detach-on-destroy`:** t-smart-tmux-session-manager recommends `set -g detach-on-destroy off` so closing a session doesn't exit tmux. The HUD should respect this behavior.

## Differentiators

Features that set this product apart. Not expected, but highly valued for Claude workflow.

### Claude-Specific Status

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Working/Idle/Blocked status | Know when Claude needs attention | Medium | v1.0 has this |
| Context window meter | Know when to start new conversation | Medium | v1.0 has this |
| Blocked sessions highlighted | Can't miss what needs attention | Low | v1.0 has this |
| Blocked-first sorting | Most important sessions at top | Low | v1.0 has this |

**Why differentiating:** Generic tmux managers show sessions exist. This HUD shows Claude workflow state. No other tool tracks AI assistant status.

### Horizontal HUD Strip

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 1-2 line HUD at top | Maximize space for active Claude | Medium | New in v2.0 |
| Tab-style session display | Horizontal space efficient | Medium | New in v2.0 |
| Always-visible strip | See all sessions while working | Low | New in v2.0 |

**Why differentiating:** Most session managers are modal (popup or full-screen list). The HUD strip is always visible, like a browser tab bar.

### Session Spawning from HUD

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `n` key to spawn new Claude session | Don't leave HUD to start work | Medium | New in v2.0 |
| Detect externally-created sessions | Works with manual tmux workflow | Low | v1.0 has this |

**Why differentiating:** tmuxinator requires pre-defined configs. t-smart-tmux-session-manager creates generic sessions. This HUD spawns Claude-ready sessions.

### Return-to-HUD

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `b` key returns to HUD | Quick toggle between work and overview | Medium | Partial in v1.0 |
| Preserve HUD context on return | Don't reset selection | Low | New requirement |

**Why differentiating:** Most managers require restarting to see the list again. The HUD maintains persistent overview.

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

### Don't Build: Session Preview Pane

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Live preview of session content | Complexity explosion, dubious value | Trust the status indicators |

**Rationale:** tmux-sessionx has preview, but it's for identifying sessions you don't remember. Claude sessions are identified by project name. Preview adds complexity without solving the core problem (knowing when Claude needs attention).

**Sources:** User decision: "Session preview pane - Defer to v3"

### Don't Build: Fuzzy Finder

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| fzf-style fuzzy search | Overkill for 5-10 sessions | Number keys 1-9 are faster |

**Rationale:** tmux-sessionx and t-smart use fuzzy finding because users have many sessions they don't remember. Claude users have 5-10 sessions they actively manage. Fuzzy finding adds latency without value.

### Don't Build: Session Configuration Files

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| YAML/JSON session configs like tmuxinator | Over-engineering for Claude use case | Spawn sessions with sensible defaults |

**Rationale:** tmuxinator's value is recreating complex multi-window layouts. Claude sessions are single-process. Don't add config overhead.

### Don't Build: Plugin System

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Extensible plugin architecture | Scope creep, maintenance burden | Build the features users need directly |

**Rationale:** Many tmux tools have plugin systems that add complexity. This HUD has a specific purpose (Claude management). Plugins dilute focus.

### Don't Build: Custom Keybinding Configuration

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User-configurable keybindings | Complexity for edge cases | Use standard conventions everyone knows |

**Rationale:** tmux users already know `j/k`, `1-9`, `q`. Adding configuration adds onboarding friction without meaningful benefit.

### Don't Build: Session Renaming UI

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Inline rename from HUD | Complexity for rare operation | Use tmux's built-in rename (`prefix + $`) |

**Rationale:** tmux already has session renaming. Don't duplicate functionality that's rarely needed.

## Reference Tools

What we learned from existing tmux management tools.

### tmuxinator

**What it is:** Ruby gem for creating tmux sessions from YAML configs.

**Key patterns:**
- Project-based session management (each config = a workspace)
- Single command to launch (`mux start project_name`)
- Configs stored in `~/.config/tmuxinator/`

**What to adopt:**
- Project-centric naming (session = project directory)
- Simple spawn command pattern

**What to skip:**
- YAML configuration files (overkill for Claude)
- Multi-window/pane layouts in config (Claude is single pane)

**Source:** [tmuxinator GitHub](https://github.com/tmuxinator/tmuxinator), [tmuxinator docs](https://tmuxinator.com/)

### tmux-sessionx

**What it is:** tmux plugin with fuzzy finder, preview, and session management.

**Key patterns:**
- fzf-tmux popup for session selection
- Preview pane showing session content
- Keybindings: `ctrl-w` (windows), `ctrl-r` (rename), `ctrl-x` (config)

**What to adopt:**
- Quick session switching as primary action
- Keyboard-first interaction

**What to skip:**
- Preview pane (identified by project name, not content)
- Fuzzy finding (5-10 sessions, not hundreds)
- fzf dependency (keep HUD self-contained)

**Source:** [tmux-sessionx GitHub](https://github.com/omerxx/tmux-sessionx)

### t-smart-tmux-session-manager

**What it is:** Zoxide-integrated session manager with smart create-or-attach.

**Key patterns:**
- `new-session -A` pattern: attach if exists, create if not
- `detach-on-destroy off` recommendation
- Bound to `prefix + T`

**What to adopt:**
- Smart session creation (idempotent spawn)
- Respect `detach-on-destroy` setting

**What to skip:**
- Zoxide integration (not relevant for Claude spawning)

**Source:** [t-smart-tmux-session-manager GitHub](https://github.com/joshmedeski/t-smart-tmux-session-manager)

### tmux-sessionist

**What it is:** Lightweight plugin for common session operations.

**Key patterns:**
- `prefix + C` to create session (prompts for name)
- `prefix + X` to kill session without detaching
- `prefix + g` for quick session switching

**What to adopt:**
- Session creation without leaving tmux
- Graceful session kill (don't exit tmux)

**What to skip:**
- Prefix-based keybindings (HUD has its own input context)

**Source:** [tmux-sessionist GitHub](https://github.com/tmux-plugins/tmux-sessionist)

### tmux Built-in Conventions

**Standard keybindings that users expect:**

| Key | Action | Adopt? |
|-----|--------|--------|
| `C-b 0-9` | Switch to window 0-9 | Yes (1-9 quick select) |
| `C-b c` | Create new window | Yes (`n` for new session) |
| `C-b d` | Detach | N/A (HUD handles this differently) |
| `C-b (` / `)` | Previous/next session | Yes (implicit via j/k) |
| `C-b s` | Choose session from list | Yes (this is what HUD is) |

**Source:** [tmux cheatsheet](https://tmuxcheatsheet.com/), [tmux man page](https://man7.org/linux/man-pages/man1/tmux.1.html)

## Feature Dependencies

```
+-----------------------------------------------------------+
|                 v1.0 EXISTING FEATURES                    |
|  - Session detection (processDetector, tmuxService)       |
|  - Status detection (hooks, hookStateService)             |
|  - Context meters (contextService)                        |
|  - Navigation (j/k, 1-9, Enter)                           |
|  - Jump service (tmux switch-client)                      |
|  - Window focus (windowFocusService)                      |
+-----------------------------------------------------------+
                            |
                            v
+-----------------------------------------------------------+
|                 v2.0 NEW FEATURES                         |
|                                                           |
|  +-------------------+     +-------------------+          |
|  | Horizontal HUD    |     | tmux Split        |          |
|  | Strip Component   |---->| Architecture      |          |
|  +-------------------+     +-------------------+          |
|           |                       |                       |
|           v                       v                       |
|  +-------------------+     +-------------------+          |
|  | Session Tabs      |     | Pane Management   |          |
|  | (minimal format)  |     | (HUD + active)    |          |
|  +-------------------+     +-------------------+          |
|           |                       |                       |
|           +-----------+-----------+                       |
|                       v                                   |
|              +-------------------+                        |
|              | Spawn New         |                        |
|              | Sessions (n key)  |                        |
|              +-------------------+                        |
|                       |                                   |
|                       v                                   |
|              +-------------------+                        |
|              | Return to HUD     |                        |
|              | (b key refined)   |                        |
|              +-------------------+                        |
+-----------------------------------------------------------+
```

**Dependency notes:**
- Horizontal HUD strip requires refactoring SessionList component
- tmux split architecture requires tmux pane management layer
- Session spawning requires directory selection UX
- Return-to-HUD builds on existing windowFocusService

## MVP Recommendation

For v2.0 MVP, prioritize in this order:

### Must Have (Table Stakes)
1. **Horizontal HUD strip** - Core UI change
2. **tmux split architecture** - HUD top, active session bottom
3. **Session switching via native tmux** - Reliability over v1.0
4. **Return to HUD with `b`** - Quick toggle

### Should Have (Key Differentiators)
5. **Spawn new sessions with `n`** - Complete workflow in HUD
6. **Detect externally-created sessions** - Works with existing workflow
7. **Preserve selection on return** - Polish

### Defer to v3
- Session preview pane
- Cost/token tracking
- Multi-machine monitoring
- Session persistence across restarts

## Keybinding Summary

**v2.0 Keybinding Map:**

| Key | Action | Convention Source |
|-----|--------|-------------------|
| `j` / `k` | Navigate down/up | vim, tmux |
| `1-9` | Quick select session | tmux window switching |
| `Enter` | Jump to selected session | Universal |
| `n` | Spawn new Claude session | tmux-sessionist pattern |
| `b` | Return to HUD | Custom (back) |
| `q` | Quit HUD | Universal |
| `?` | Toggle help | Universal |

**Not adding:**
- `d` for detach (tmux handles this)
- `x` for kill session (too dangerous, use tmux)
- `r` for rename (use tmux's `prefix + $`)

## Sources

### Primary (HIGH confidence)
- [tmux-sessionx GitHub](https://github.com/omerxx/tmux-sessionx) - Modern session manager patterns
- [tmuxinator GitHub](https://github.com/tmuxinator/tmuxinator) - Project-based session management
- [t-smart-tmux-session-manager GitHub](https://github.com/joshmedeski/t-smart-tmux-session-manager) - Smart create-or-attach pattern
- [tmux-sessionist GitHub](https://github.com/tmux-plugins/tmux-sessionist) - Lightweight session operations
- [tmux cheatsheet](https://tmuxcheatsheet.com/) - Standard keybinding conventions
- [tmux Getting Started Wiki](https://github.com/tmux/tmux/wiki/Getting-Started) - Official patterns

### Secondary (MEDIUM confidence)
- [tmux status bar customization](https://www.baeldung.com/linux/tmux-status-bar-customization) - Status line patterns
- [Ham Vocke tmux guide](https://hamvocke.com/blog/a-guide-to-customizing-your-tmux-conf/) - Best practices
- [Decker HUD](https://github.com/swordsmanluke/decker) - Terminal HUD design patterns

### Tertiary (LOW confidence)
- WebSearch results on tmux UX patterns - Community consensus
- [C.H.U.D. GitHub](https://github.com/realjbmangum/chud) - Claude-specific HUD inspiration

## Metadata

**Confidence breakdown:**
- Table stakes features: HIGH - Well-established patterns across multiple tools
- Differentiators: HIGH - Clear value proposition for Claude workflow
- Anti-features: MEDIUM - Based on user scope decisions, may revisit in v3
- Keybindings: HIGH - Based on universal conventions

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable domain)

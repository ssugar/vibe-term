# Architecture Research: v2.0 tmux-Integrated HUD Strip

**Researched:** 2026-01-25
**Domain:** tmux pane architecture for always-visible HUD strip
**Confidence:** HIGH (tmux patterns well-documented, existing codebase understood)

## Current Architecture Summary

The v1.0 codebase is a full-screen Ink (React TUI) application with:

**Components:**
- `App.tsx` - Main component with keyboard handling, overlays, layout
- `Header.tsx` - Status summary (blocked/working/idle counts)
- `Footer.tsx` - Keybindings and last refresh time
- `SessionList.tsx` - Vertical list of sessions
- `SessionRow.tsx` - Individual session display with status, context, tmux indicator

**State Management:**
- `appStore.ts` (Zustand) - UI state, sessions array, selection index, error handling
- `types.ts` - Session interface with pid, status, contextUsage, tmuxTarget, etc.

**Services:**
- `processDetector.ts` - Find Claude processes via `ps` command
- `tmuxService.ts` - Get tmux panes, check if process is in tmux
- `sessionBuilder.ts` - Build Session objects from processes + tmux context
- `jumpService.ts` - Navigate to tmux session (switch-client/attach)
- `windowFocusService.ts` - Focus non-tmux terminal windows
- `hookStateService.ts` - Read Claude hook state files for status
- `contextService.ts` - Parse JSONL transcripts for context usage

**Hooks:**
- `useSessions.ts` - Polls for sessions, updates store
- `useInterval.ts` - Reliable polling utility

**Key Characteristics:**
- Full-screen layout - HUD occupies entire terminal
- Vertical session list - Sessions displayed as rows
- Ink renders entire UI - All content managed by React/Ink
- Jump navigates away - Jumping leaves HUD, return is unreliable

## Integration Approach

### Target Architecture

```
tmux session: claude-hud
+----------------------------------------------------------------+
| [1:proj-a ⏳ 45%] [2:proj-b ✓ 12%] [3:proj-c 🛑 78%]            | <- HUD pane (Ink app)
+----------------------------------------------------------------+
|                                                                 |
|  Active Claude session pane (shell running Claude)              |
|                                                                 |
+----------------------------------------------------------------+
```

### Core Insight

**tmux becomes the container; HUD becomes a status layer.**

The v2.0 architecture inverts the relationship:
- **v1.0:** HUD is the primary app, sessions exist externally
- **v2.0:** tmux is the primary container, HUD is a pane within it

This gives us:
1. **Reliable session switching** - Native tmux `select-pane` commands
2. **Always-visible HUD** - Top pane never changes
3. **Input isolation** - Only active pane receives keystrokes
4. **Persistent sessions** - tmux survives terminal disconnect

### tmux Pane Layout Strategy

**Horizontal split with fixed-height HUD:**

```bash
# Create initial layout
tmux new-session -d -s claude-hud -n main
tmux split-window -v -t claude-hud:main -l 2  # HUD at bottom with 2 lines
tmux select-pane -t claude-hud:main.0         # Focus the top pane (sessions)
tmux swap-pane -D -t claude-hud:main.1        # Move HUD to top

# Result: HUD in pane 0 (top), sessions in pane 1 (bottom)
```

**Fixed-height HUD pane:**
- tmux `resize-pane -y 2` sets absolute row height
- Minimum tmux pane is 2 rows (PANE_MINIMUM in tmux source)
- HUD strip of 1-2 lines fits perfectly

**Note:** tmux `resize-pane -y 2` has a quirk where it may resize to 3 rows minimum for existing panes. Create with `-l 2` on `split-window` instead.

### Input Routing Model

**tmux handles input routing natively:**

1. **HUD pane active:** Ink receives all keystrokes
   - `j/k` for selection
   - `1-9` for quick select
   - `Enter` to switch to session pane
   - `n` to spawn new session

2. **Session pane active:** Claude receives all keystrokes
   - Normal Claude operation
   - `b` (via tmux bind-key) returns to HUD pane

**No stdin splitting needed.** tmux panes are separate PTYs.

### HUD-to-Session Communication

**Mechanism:** tmux commands via `execAsync`

```typescript
// Switch focus to session pane
await execAsync('tmux select-pane -t claude-hud:main.1');

// Return to HUD pane
await execAsync('tmux select-pane -t claude-hud:main.0');

// Spawn Claude in session pane
await execAsync('tmux send-keys -t claude-hud:main.1 "claude" Enter');
```

**No IPC protocol needed.** HUD doesn't need to communicate with Claude; it monitors Claude state via existing hook files.

## New Components Needed

### 1. tmuxPaneManager Service

**Purpose:** Manage the tmux session/pane structure for the HUD

**Responsibilities:**
- Create claude-hud tmux session on startup (if not exists)
- Create/manage HUD pane (top) and session pane (bottom)
- Handle session switching in session pane
- Spawn new Claude instances in session pane

**Interface:**
```typescript
// src/services/tmuxPaneManager.ts
export interface TmuxPaneManager {
  initialize(): Promise<void>;       // Create session, panes
  switchToSession(target: string): Promise<void>;
  returnToHud(): Promise<void>;
  spawnClaude(cwd: string): Promise<void>;
  detectExternalSessions(): Promise<Session[]>;
}
```

### 2. HudStrip Component

**Purpose:** Horizontal tab-style display replacing vertical SessionList

**Responsibilities:**
- Render sessions as horizontal tabs
- Fit in 1-2 terminal rows
- Show condensed info: `[index:name status context%]`
- Highlight selected session

**Interface:**
```tsx
// src/components/HudStrip.tsx
interface HudStripProps {
  sessions: Session[];
  selectedIndex: number;
  terminalWidth: number;
}
```

**Layout per tab:** `[1:proj-name ✓ 25%]`
- Index (1-9)
- Truncated project name
- Status emoji
- Context percentage (no meter, just number)

### 3. SessionTab Component

**Purpose:** Single session in horizontal format

**Responsibilities:**
- Condensed single-tab rendering
- Color coding by status
- Selection indicator (inverse colors or bracket style)

### 4. Startup Orchestrator

**Purpose:** Initialize the tmux environment before Ink app starts

**Responsibilities:**
- Check if already in claude-hud session
- Create tmux session if needed
- Split panes if needed
- Start Ink app in HUD pane
- Return error if tmux not available

**Location:** `src/startup.ts` (runs before `cli.tsx`)

## Modified Components

### App.tsx

**Changes:**
- Remove overlays (help, exit confirmation) - space is precious
- Change layout to single-row horizontal strip
- Add keyboard handlers for `n` (new session), `b` (back to HUD via tmux)
- Remove full-screen padding, borders

**Before:**
```tsx
<Box flexDirection="column" padding={1}>
  <Header />
  <Box flexGrow={1}><SessionList /></Box>
  <Footer />
</Box>
```

**After:**
```tsx
<Box flexDirection="row">
  <HudStrip sessions={sessions} selectedIndex={selectedIndex} />
</Box>
```

### appStore.ts

**Changes:**
- Add `hudSessionName: string` - tmux session name for our HUD
- Add `sessionPaneTarget: string` - current session pane target
- May remove some v1.0-specific state (showHelp overlay, etc.)

### jumpService.ts

**Changes:**
- Simplify to use tmuxPaneManager for switching
- No more window focus logic needed (all sessions in tmux)
- Switching means: select session pane, then switch to session's pane within our tmux session

**Key insight:** In v2.0, "jumping" means switching which Claude runs in our session pane, not focusing external windows.

### useSessions.ts

**Changes:**
- Continue polling for all Claude processes
- Add logic to detect externally-created Claude sessions in our tmux session
- May filter to only show sessions in our managed tmux session (or all + indicator)

### Header.tsx / Footer.tsx

**Changes:**
- **Remove entirely** - HUD strip is the only visible element
- Status counts could move into a minimal indicator on the strip if space permits

## Data Flow

### Session Discovery Flow (unchanged conceptually)

```
useSessions hook
    |
    v
findClaudeProcesses() --> buildSessions() --> appStore.setSessions()
    +                          |
    |                          v
getTmuxPanes() ----------------+
```

### Session Switching Flow (v2.0)

```
User presses Enter on selected session
    |
    v
App.tsx: jumpToSession(session)
    |
    v
tmuxPaneManager.switchToSession(session.tmuxTarget)
    |
    v
tmux send-keys -t session-pane "tmux switch-client -t {target}"
  OR
tmux send-keys -t session-pane "cd {path} && claude" Enter
    |
    v
User sees session in bottom pane
```

### New Session Flow (v2.0)

```
User presses 'n'
    |
    v
App.tsx: spawnNewSession()
    |
    v
tmuxPaneManager.spawnClaude(cwd)
    |
    v
tmux send-keys -t session-pane "cd {cwd} && claude" Enter
    |
    v
New session appears in HUD strip after next poll
```

### Return to HUD Flow

```
User presses 'b' (bound via tmux)
    |
    v
tmux select-pane -t hud-pane
    |
    v
HUD pane is active, user can navigate sessions
```

## Architecture Patterns

### Pattern 1: tmux as Process Container

**What:** Let tmux manage process lifecycle, HUD is observer

**Why:**
- tmux handles session persistence natively
- No need for node-pty or embedded terminals
- Reliable session switching via native tmux commands
- Survives SSH disconnects

**How:**
- HUD never spawns Claude directly; sends commands to tmux panes
- HUD reads Claude state via hook files (existing pattern)
- HUD commands tmux to switch panes

### Pattern 2: Minimal HUD Surface Area

**What:** HUD pane is 1-2 rows, maximizes space for Claude

**Why:**
- Core value: monitor without obstruction
- Sessions need maximum screen real estate
- Status can be conveyed in compact format

**How:**
- Fixed-height tmux pane (2 rows minimum)
- Horizontal tab layout vs vertical list
- No overlays or secondary UI elements

### Pattern 3: tmux Keybinding Integration

**What:** Register HUD-related keybindings in tmux config

**Why:**
- 'b' key should work even when session pane is active
- tmux prefix + key is reliable from any pane

**How:**
```bash
# In startup or user's .tmux.conf
bind-key b select-pane -t claude-hud:main.0  # Return to HUD
```

Or HUD startup script adds this binding dynamically.

### Anti-Patterns to Avoid

1. **Embedded PTY:** Don't try to run Claude inside Ink/Node. Use tmux panes.

2. **stdin multiplexing:** Don't try to split input between HUD and session. Let tmux handle it.

3. **Full-screen HUD in v2.0:** Don't keep the full-screen layout. It defeats the always-visible purpose.

4. **IPC between HUD and Claude:** Don't build custom communication. Read hook files, send tmux commands.

## Build Order

Based on dependencies and integration points, recommended implementation sequence:

### Wave 1: tmux Infrastructure

**Plan 1: tmux Pane Manager Foundation**
- Create `tmuxPaneManager.ts` service
- Implement session/pane creation logic
- Implement `initialize()`, `returnToHud()`, `selectSessionPane()`
- Test: Can create claude-hud session with correct pane layout

### Wave 2: Startup Flow

**Plan 2: Startup Orchestrator**
- Create `startup.ts` that runs before Ink
- Check/create tmux session
- Launch Ink in HUD pane
- Handle "already running" case gracefully
- Test: `cc-tui-hud` command creates correct tmux environment

### Wave 3: UI Transformation

**Plan 3: HudStrip Component**
- Create `HudStrip.tsx` horizontal layout
- Create `SessionTab.tsx` for individual tabs
- Handle terminal width detection and tab truncation
- Test: Sessions render as horizontal tabs

**Plan 4: App Layout Refactor**
- Replace full-screen layout with strip layout
- Remove Header, Footer, overlays
- Adjust keyboard handlers for new layout
- Test: HUD renders in 1-2 rows

### Wave 4: Session Management

**Plan 5: Session Switching Integration**
- Update `jumpService.ts` to use tmuxPaneManager
- Implement switching active session in session pane
- Add 'n' key handler for new session
- Test: Enter switches session, 'n' spawns new Claude

**Plan 6: External Session Detection**
- Detect Claude sessions created outside HUD
- Integrate them into the session list
- Handle sessions in other tmux sessions gracefully
- Test: Externally started Claude appears in HUD

### Wave 5: Polish

**Plan 7: tmux Keybinding and UX**
- Register 'b' binding for return-to-HUD
- Add any final polish (colors, indicators)
- Document user setup requirements
- Test: Full workflow - launch, switch, return, spawn

## Integration Points Summary

| Existing Component | Integration Type | Changes Needed |
|-------------------|------------------|----------------|
| `appStore.ts` | Extend | Add hudSessionName, sessionPaneTarget |
| `useSessions.ts` | Extend | Add external session detection |
| `jumpService.ts` | Replace internals | Use tmuxPaneManager instead of direct tmux |
| `tmuxService.ts` | Reuse | Keep for session detection, add pane info |
| `App.tsx` | Major refactor | New layout, new handlers |
| `SessionRow.tsx` | Replace | New SessionTab component |
| `Header.tsx` | Remove | Strip replaces header |
| `Footer.tsx` | Remove | Strip replaces footer |

## Open Questions

### 1. External Session Handling

**Question:** How to handle Claude sessions running in other tmux sessions (not claude-hud)?

**Options:**
- A) Show all sessions, mark external ones, switch to their tmux session on select
- B) Only show sessions in claude-hud tmux session
- C) Offer to "adopt" external sessions by attaching them

**Recommendation:** Option A - show all with indicator. Users may have legitimate sessions elsewhere. Switching would use `tmux switch-client` to their session.

### 2. Multiple HUD Instances

**Question:** What if user runs `cc-tui-hud` twice?

**Options:**
- A) Error: "HUD already running in tmux session claude-hud"
- B) Attach to existing session
- C) Create claude-hud-2, claude-hud-3, etc.

**Recommendation:** Option B - attach to existing. Single source of truth.

### 3. Non-tmux Fallback

**Question:** What if tmux isn't available?

**Options:**
- A) Error and exit
- B) Fall back to v1.0 full-screen mode
- C) Install tmux automatically (too invasive)

**Recommendation:** Option A with clear message. v2.0 is tmux-integrated by design per PROJECT.md constraints.

## Sources

### tmux Commands and Patterns
- [tmux man page](https://man7.org/linux/man-pages/man1/tmux.1.html) - Authoritative command reference
- [tmux Wiki - Getting Started](https://github.com/tmux/tmux/wiki/Getting-Started) - Session/window/pane concepts
- [tmux Wiki - Control Mode](https://github.com/tmux/tmux/wiki/Control-Mode) - Programmatic control patterns
- [Tao of Tmux - Scripting](https://tao-of-tmux.readthedocs.io/en/latest/manuscript/10-scripting.html) - Scripting patterns
- [tmux split-window guide](https://gist.github.com/sdondley/b01cc5bb1169c8c83401e438a652b84e) - Detailed split-window usage
- [tmux resize-pane discussion](https://github.com/tmux/tmux/issues/1480) - Minimum pane size behavior

### Ink React TUI
- [Ink GitHub](https://github.com/vadimdemedes/ink) - useInput, useStdin, rendering patterns
- [Ink npm](https://www.npmjs.com/package/ink) - API documentation

### Node.js tmux Libraries
- [node-tmux npm](https://www.npmjs.com/package/node-tmux) - Lightweight wrapper (reference, not dependency)

---

**Confidence Assessment:**

| Area | Confidence | Reason |
|------|------------|--------|
| tmux pane mechanics | HIGH | Well-documented, stable for 20+ years |
| Ink single-row rendering | HIGH | Existing codebase proves capability |
| Integration approach | HIGH | Builds on existing services, minimal new concepts |
| External session handling | MEDIUM | Multiple valid approaches, needs user feedback |

**Research date:** 2026-01-25

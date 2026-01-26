---
phase: 08
plan: 03
subsystem: ui
tags: [components, integration, layout, tmux, react]
dependency-graph:
  requires: [08-02]
  provides: [HudStrip, compact-hud-layout]
  affects: []
tech-stack:
  added: []
  patterns: [inline-prompts, tmux-hooks, attach-recovery]
key-files:
  created:
    - src/components/HudStrip.tsx
  modified:
    - src/app.tsx
    - src/services/configService.ts
    - src/services/tmuxService.ts
    - src/startup.ts
    - src/cli.tsx
decisions:
  - inline-prompts-over-overlays
  - 3-line-hud-height
  - client-attached-hook-for-recovery
metrics:
  duration: 15min
  completed: 2026-01-26
---

# Phase 8 Plan 03: App Integration Summary

**One-liner:** HudStrip wrapper with inline prompts, 3-line compact height, and robust attach/reattach recovery.

## What Was Built

### HudStrip Component
Top-level container wrapping TabStrip with adaptive second line.

```typescript
// src/components/HudStrip.tsx
export function HudStrip({ showHelp, error, quitMode, isConfirmingExit }: HudStripProps): React.ReactElement
```

**Line 2 priority (highest to lowest):**
1. Quit prompt (q key) - detach/kill options
2. Exit confirmation (Ctrl+C) - y/n
3. Help text (? key)
4. Error message
5. Nothing (1-line mode)

### App Integration
- Replaced Header/SessionList/Footer with HudStrip
- Added left/right arrow navigation for horizontal tabs
- Removed overlay-based prompts (didn't fit in 3-line pane)

### Compact HUD Height
- Reduced default from 15 lines to 3 lines
- Fits: 1 line tabs + 1 line help/prompts + 1 buffer

### Attach/Reattach Recovery
Multiple fixes to ensure HUD appears reliably:

1. **startup.ts**: When reattaching via `npm start`, checks pane count and recreates HUD pane if missing
2. **tmuxService.ts createHudLayout**: Skips split if layout already exists (prevents double panes)
3. **tmuxService.ts configureSession**: Sets up `client-attached` hook for direct `tmux attach`

## Technical Decisions

### Inline Prompts Over Overlays
Overlays with `position="absolute"` rendered outside the 3-line pane boundary. Moved all prompts (quit, exit confirm) inline to line 2 of HudStrip.

### 3-Line HUD Height
Minimal footprint while accommodating:
- Tab strip (line 1)
- Help/prompts/errors (line 2)
- Small buffer for rendering

### Client-Attached Hook for Recovery
When user runs `tmux attach -t claude-terminal` directly (bypassing our CLI), the hook:
- Checks if only 1 pane exists (HUD was closed)
- Splits to create HUD pane at top
- Starts HUD process in new pane

### React Hooks Order Fix
Original code had early return before useEffect, violating React's rules of hooks. Restructured to call all hooks before any conditional returns.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 90bfa8a | feat | create HudStrip wrapper component |
| 60b40ab | feat | integrate HudStrip into app.tsx |
| f307ae2 | fix | fix useEffect dependency causing potential re-render loop |
| c54009a | fix | fix React hooks order violation causing crash |
| e14edf4 | feat | reduce HUD height from 15 to 3 lines |
| 77174f3 | fix | move quit/exit prompts inline to fit compact HUD |
| 3c1f7ef | fix | recreate HUD pane when reattaching to existing session |
| b06d707 | fix | skip layout creation if panes already exist |
| 9481e37 | feat | add client-attached hook for direct tmux attach |

## Deviations from Plan

1. **Additional fixes required**: React hooks order violation, overlay positioning, reattach recovery - all discovered during human verification
2. **More commits than planned**: 9 commits vs expected 2-3 due to iterative bug fixes

## Human Verification Results

Verified working:
- ✓ Compact 1-2 line HUD display
- ✓ Horizontal tabs with sessions
- ✓ Left/right arrow navigation
- ✓ j/k navigation still works
- ✓ Number hotkeys 1-9
- ✓ Enter to jump
- ✓ q quit prompt (inline)
- ✓ ? help text (inline)
- ✓ Reattach via npm start
- ✓ Reattach via tmux attach

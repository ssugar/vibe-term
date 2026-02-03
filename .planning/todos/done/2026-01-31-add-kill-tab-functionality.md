---
created: 2026-01-31T09:38
title: Add kill tab functionality
area: ui
files:
  - src/components/TabStrip.tsx
  - src/services/paneSessionManager.ts
---

## Problem

Currently there's no way to kill/close a specific Claude session tab from within vibe-term. Users need a way to terminate individual sessions without leaving the HUD - for example, to clean up stuck sessions, close completed work, or manage multiple sessions.

## Solution

TBD - likely a keybinding (e.g., 'x' or 'd') on selected tab that:
1. Confirms with user before killing
2. Kills the tmux pane associated with the session
3. Removes the session from the tab strip
4. Handles cleanup of any session state files

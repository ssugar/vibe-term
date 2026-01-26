import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/appStore.js';
import { useInterval } from './useInterval.js';
import { findClaudeProcesses } from '../services/processDetector.js';
import { getTmuxPanes } from '../services/tmuxService.js';
import { buildSessions } from '../services/sessionBuilder.js';
import { cleanupSessionPane } from '../services/paneSessionManager.js';
import { execAsync } from '../services/platform.js';

/**
 * Hook that manages session detection and polling.
 * Polls for Claude processes and updates the store with enriched sessions.
 * Uses useInterval for reliable polling and refs for stable ordering.
 */
export function useSessions(): void {
  // Get refresh interval from store
  const refreshInterval = useAppStore((state) => state.refreshInterval);

  // Track previous session order for stable sorting across refreshes
  const previousOrderRef = useRef<string[]>([]);

  // Track previous sessions for removal detection
  // Map of sessionId -> isExternal (to avoid cleaning up external session panes)
  const previousSessionsRef = useRef<Map<string, boolean>>(new Map());

  // Track if initial load has happened
  const initialLoadRef = useRef(false);

  // Refresh callback - uses getState() to avoid stale closures
  const refresh = useCallback(async () => {
    try {
      // Fetch processes and tmux panes in parallel
      const [processes, panes] = await Promise.all([
        findClaudeProcesses(),
        getTmuxPanes(),
      ]);

      // Build sessions with previous order for stability
      const previousOrder = previousOrderRef.current;
      const sessions = await buildSessions(processes, panes, previousOrder);

      // Detect removed sessions (were in previous, not in current)
      const currentIds = new Set(sessions.map(s => s.id));
      const removedIds = [...previousSessionsRef.current.keys()].filter(id => !currentIds.has(id));

      // Clean up panes for removed INTERNAL sessions only
      // External sessions belong to other tmux sessions - do NOT kill their panes
      for (const id of removedIds) {
        const wasExternal = previousSessionsRef.current.get(id) ?? false;
        if (!wasExternal) {
          await cleanupSessionPane(id).catch(() => {});
        }
      }

      // If active session was removed, clear it and focus HUD
      const activeSessionId = useAppStore.getState().activeSessionId;
      if (activeSessionId && removedIds.includes(activeSessionId)) {
        useAppStore.getState().setActiveSessionId(null);

        // Focus HUD pane
        execAsync('tmux show-environment CLAUDE_TERMINAL_HUD_PANE')
          .then(({ stdout }) => {
            const hudPaneId = stdout.split('=')[1]?.trim();
            if (hudPaneId) {
              return execAsync(`tmux select-pane -t ${hudPaneId}`);
            }
          })
          .catch(() => {}); // Ignore errors - HUD pane might not exist
      }

      // Update previous sessions for next cycle
      previousSessionsRef.current = new Map(sessions.map(s => [s.id, s.isExternal]));

      // Update previous order for next cycle
      previousOrderRef.current = sessions.map((s) => s.id);

      // Update store using getState() to avoid dependency issues
      useAppStore.getState().setSessions(sessions);
      useAppStore.getState().setLastRefresh(new Date());
      useAppStore.getState().setError(null);
    } catch (err) {
      useAppStore.getState().setError(
        err instanceof Error ? err.message : 'Failed to detect sessions'
      );
    }
  }, []);

  // Initial load on mount (run only once)
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    refresh();
  }, [refresh]);

  // Polling via useInterval
  useInterval(refresh, refreshInterval);
}

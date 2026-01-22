import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/appStore.js';
import { useInterval } from './useInterval.js';
import { findClaudeProcesses } from '../services/processDetector.js';
import { getTmuxPanes } from '../services/tmuxService.js';
import { buildSessions } from '../services/sessionBuilder.js';

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

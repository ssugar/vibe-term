import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/appStore.js';
import { useInterval } from './useInterval.js';
import { findClaudeProcesses } from '../services/processDetector.js';
import { getTmuxPanes } from '../services/tmuxService.js';
import { buildSessions } from '../services/sessionBuilder.js';
import { execAsync } from '../services/platform.js';

/**
 * Session info stored for removal detection
 */
interface PreviousSessionInfo {
  isExternal: boolean;
  paneId?: string;
}

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
  // Map of sessionId -> { isExternal, paneId }
  const previousSessionsRef = useRef<Map<string, PreviousSessionInfo>>(new Map());

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

      // Get pane info for removed sessions (needed for cleanup)
      const removedPaneInfos: Array<{ id: string; paneId: string }> = [];
      for (const id of removedIds) {
        const prevInfo = previousSessionsRef.current.get(id);
        if (prevInfo && !prevInfo.isExternal && prevInfo.paneId) {
          removedPaneInfos.push({ id, paneId: prevInfo.paneId });
        }
      }

      // If active session was removed, switch to another session or show welcome
      // IMPORTANT: Do the swap FIRST, then kill panes. If we kill the active session's
      // pane first, there won't be a main pane to swap into.
      const activeSessionId = useAppStore.getState().activeSessionId;
      const activeSessionWasRemoved = activeSessionId && removedIds.includes(activeSessionId);

      if (activeSessionWasRemoved) {
        useAppStore.getState().setActiveSessionId(null);

        // Get HUD pane ID from environment
        const getEnv = async (name: string) => {
          try {
            const { stdout } = await execAsync(`tmux show-environment ${name}`);
            return stdout.split('=')[1]?.trim();
          } catch {
            return undefined;
          }
        };

        // Dynamically find main pane (the pane in current window that isn't HUD)
        // This is necessary because pane IDs change positions after swap-pane operations
        const findMainPane = async (hudPaneId: string | undefined): Promise<string | undefined> => {
          try {
            const { stdout: paneList } = await execAsync(`tmux list-panes -F '#{pane_id}'`);
            const panes = paneList.trim().split('\n');
            return panes.find(p => p !== hudPaneId) || panes[1];
          } catch {
            return undefined;
          }
        };

        (async () => {
          const hudPaneId = await getEnv('CLAUDE_TERMINAL_HUD_PANE');
          const mainPaneId = await findMainPane(hudPaneId);

          if (sessions.length > 0) {
            // Switch to first remaining session
            const nextSession = sessions[0];
            const targetPaneId = nextSession.paneId;

            if (targetPaneId && mainPaneId) {
              // Swap the next session into the main pane
              // After swap: targetPaneId location has old main content (the closed session)
              await execAsync(`tmux swap-pane -s ${targetPaneId} -t ${mainPaneId}`).catch(() => {});
              await execAsync(`tmux set-environment CLAUDE_ACTIVE_SESSION ${nextSession.id}`).catch(() => {});
              useAppStore.getState().setActiveSessionId(nextSession.id);

              // Now kill the orphaned pane (old main content now in scratch at targetPaneId location)
              // This prevents scratch window from filling up
              await execAsync(`tmux kill-pane -t ${targetPaneId}`).catch(() => {});
            }
          } else if (mainPaneId) {
            // No sessions left - show welcome screen in main pane
            const welcomeArt = `
  ╔═══════════════════════════════════════════════════════════════╗
  ║                                                               ║
  ║         ██╗   ██╗██╗██████╗ ███████╗                          ║
  ║         ██║   ██║██║██╔══██╗██╔════╝                          ║
  ║         ██║   ██║██║██████╔╝█████╗══                          ║
  ║         ╚██╗ ██╔╝██║██╔══██╗██╔════╝                          ║
  ║          ╚████╔╝ ██║██████╔╝███████╗                          ║
  ║           ╚═══╝  ╚═╝╚═════╝ ╚══════╝                          ║
  ║                    ████████╗███████╗██████╗ ███╗   ███╗       ║
  ║                    ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║       ║
  ║                       ██║   █████╗  ██████╔╝██╔████╔██║       ║
  ║                       ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║       ║
  ║                       ██║   ███████╗██║  ██║██║ ╚═╝ ██║       ║
  ║                       ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝       ║
  ║                                                               ║
  ║          Your AI-powered terminal session manager             ║
  ║                                                               ║
  ║   Press n in HUD to spawn a new Claude session                ║
  ║   1-9 to jump to session | Ctrl+h to focus HUD                ║
  ║   Press ? for help | q to quit                                ║
  ║                                                               ║
  ╚═══════════════════════════════════════════════════════════════╝
`;
            const escapedArt = welcomeArt.replace(/'/g, "'\\''");
            await execAsync(
              `tmux send-keys -t ${mainPaneId} 'clear && echo '"'"'${escapedArt}'"'"'' Enter`
            ).catch(() => {});
          }

          // Focus HUD pane
          if (hudPaneId) {
            await execAsync(`tmux select-pane -t ${hudPaneId}`).catch(() => {});
          }

          // Clean up panes for removed INACTIVE sessions (not the active one we handled above)
          // These are in scratch and can be killed directly
          for (const { id, paneId } of removedPaneInfos) {
            if (id !== activeSessionId) {
              execAsync(`tmux kill-pane -t ${paneId}`).catch(() => {});
            }
          }
        })();
      } else {
        // No active session was removed - just clean up inactive session panes
        for (const { paneId } of removedPaneInfos) {
          execAsync(`tmux kill-pane -t ${paneId}`).catch(() => {});
        }
      }

      // Update previous sessions for next cycle
      previousSessionsRef.current = new Map(
        sessions.map(s => [s.id, { isExternal: s.isExternal, paneId: s.paneId }])
      );

      // Update previous order for next cycle
      previousOrderRef.current = sessions.map((s) => s.id);

      // Update store using getState() to avoid dependency issues
      useAppStore.getState().setSessions(sessions);
      useAppStore.getState().setLastRefresh(new Date());
      useAppStore.getState().setError(null);

      // Check if HUD pane is focused
      execAsync('tmux display-message -p "#{pane_id}"')
        .then(({ stdout: currentPaneId }) => {
          execAsync('tmux show-environment CLAUDE_TERMINAL_HUD_PANE')
            .then(({ stdout: hudEnv }) => {
              const hudPaneId = hudEnv.split('=')[1]?.trim();
              const isFocused = currentPaneId.trim() === hudPaneId;
              useAppStore.getState().setHudFocused(isFocused);
            })
            .catch(() => {
              // If we can't determine focus, assume focused
              useAppStore.getState().setHudFocused(true);
            });
        })
        .catch(() => {
          useAppStore.getState().setHudFocused(true);
        });
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

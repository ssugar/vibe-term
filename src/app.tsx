import React, { useRef, useEffect, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { spawnSync } from 'child_process';
import { useAppStore } from './stores/appStore.js';
import { useInterval } from './hooks/useInterval.js';
import { useSessions } from './hooks/useSessions.js';
import { HudStrip } from './components/HudStrip.js';
import { saveHudWindowId, returnToHud } from './services/windowFocusService.js';
import { TMUX_SESSION_NAME } from './startup.js';
import { execAsync } from './services/platform.js';
import {
  switchToSession,
  getSessionPane,
  createSessionPane,
  ensureScratchWindow,
} from './services/paneSessionManager.js';

interface AppProps {
  refreshInterval: number;
}

export default function App({ refreshInterval }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const initializedRef = useRef(false);

  // Quit mode state: 'none' | 'confirming' (shows detach/kill prompt)
  const [quitMode, setQuitMode] = useState<'none' | 'confirming'>('none');

  // Spawn mode state for creating new sessions
  const [spawnMode, setSpawnMode] = useState(false);
  const [spawnInput, setSpawnInput] = useState('');

  // Session detection polling hook
  useSessions();

  // Store state (selective subscriptions to prevent unnecessary re-renders)
  const isConfirmingExit = useAppStore((state) => state.isConfirmingExit);
  const showHelp = useAppStore((state) => state.showHelp);
  const error = useAppStore((state) => state.error);
  const sessions = useAppStore((state) => state.sessions);
  const selectedIndex = useAppStore((state) => state.selectedIndex);

  // Store actions - get directly from store to avoid dependency issues
  const setConfirmingExit = useAppStore((state) => state.setConfirmingExit);
  const setShowHelp = useAppStore((state) => state.setShowHelp);

  // Initialize on mount - only once
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      useAppStore.getState().setRefreshInterval(refreshInterval);
      useAppStore.getState().setLastRefresh(new Date());
      // Save HUD window ID for return-to-HUD feature (Linux X11 only)
      saveHudWindowId();
    }
  }, [refreshInterval]);

  // Polling interval - updates lastRefresh every tick
  // Note: Session detection is handled by useSessions hook
  useInterval(() => {
    useAppStore.getState().setLastRefresh(new Date());
  }, refreshInterval);

  // Handle keyboard input
  useInput((input, key) => {
    // Handle Ctrl+C (check both key.ctrl and raw character)
    if ((key.ctrl && input === 'c') || input === '\x03') {
      if (isConfirmingExit) {
        // Second Ctrl+C - exit immediately
        exit();
      } else {
        // First Ctrl+C - show confirmation
        setConfirmingExit(true);
        // Auto-dismiss after 2 seconds
        setTimeout(() => {
          useAppStore.getState().setConfirmingExit(false);
        }, 2000);
      }
      return;
    }

    // If confirming exit, handle y/n
    if (isConfirmingExit) {
      if (input === 'y' || input === 'Y') {
        exit();
      } else {
        setConfirmingExit(false);
      }
      return;
    }

    // If showing help, any key dismisses
    if (showHelp) {
      setShowHelp(false);
      return;
    }

    // Handle quit confirmation keys (detach/kill prompt)
    if (quitMode === 'confirming') {
      if (input === 'd') {
        // Detach: session stays alive, user returns to original terminal
        spawnSync('tmux', ['detach-client'], { stdio: 'inherit' });
        exit();
      } else if (input === 'k') {
        // Kill: cleanup completely, destroy the tmux session
        spawnSync('tmux', ['kill-session', '-t', TMUX_SESSION_NAME], { stdio: 'inherit' });
        exit();
      } else if (key.escape || input === 'n') {
        // Cancel: return to normal HUD
        setQuitMode('none');
      }
      return;
    }

    // Navigation key handling (only when sessions exist)
    if (sessions.length > 0) {
      // j/k and arrow key navigation
      if (input === 'j' || key.downArrow) {
        useAppStore.getState().setSelectedIndex(
          Math.min(selectedIndex + 1, sessions.length - 1)
        );
        return;
      }
      if (input === 'k' || key.upArrow) {
        useAppStore.getState().setSelectedIndex(
          Math.max(selectedIndex - 1, 0)
        );
        return;
      }

      // Left/right arrow navigation for horizontal tab strip
      if (key.leftArrow) {
        useAppStore.getState().setSelectedIndex(
          Math.max(selectedIndex - 1, 0)
        );
        return;
      }
      if (key.rightArrow) {
        useAppStore.getState().setSelectedIndex(
          Math.min(selectedIndex + 1, sessions.length - 1)
        );
        return;
      }

      // Number hotkeys 1-9 for quick-jump
      if (/^[1-9]$/.test(input)) {
        const targetIndex = parseInt(input, 10) - 1;
        if (targetIndex < sessions.length) {
          useAppStore.getState().setSelectedIndex(targetIndex);
        }
        return;
      }

      // Enter to switch to selected session in main pane
      if (key.return) {
        const state = useAppStore.getState();
        const session = state.sessions[state.selectedIndex];
        if (session) {
          // Check if session is in tmux (can only switch to tmux sessions)
          if (!session.inTmux) {
            state.setError('Cannot switch to non-tmux session');
            setTimeout(() => {
              useAppStore.getState().setError(null);
            }, 3000);
            return;
          }

          // Check if session is internal (in claude-terminal) or external (other tmux session)
          const isInternalSession = session.tmuxTarget?.startsWith(`${TMUX_SESSION_NAME}:`);

          if (isInternalSession) {
            // Internal session: use pane swapping within claude-terminal
            execAsync('tmux show-environment CLAUDE_TERMINAL_HUD_PANE')
              .then(({ stdout }) => {
                const hudPaneId = stdout.split('=')[1]?.trim();
                // Get all panes and find the main one (not HUD)
                return execAsync(`tmux list-panes -F '#{pane_id}'`)
                  .then(({ stdout: paneList }) => {
                    const panes = paneList.trim().split('\n');
                    const mainPaneId = panes.find(p => p !== hudPaneId) || panes[1];

                    // Check if session pane exists, create if not
                    return getSessionPane(session.id)
                      .then((sessionPaneId) => {
                        if (!sessionPaneId) {
                          // Pane doesn't exist yet - ensure scratch window and create pane
                          return ensureScratchWindow()
                            .then(() => createSessionPane(session.id, session.projectPath))
                            .then(() => switchToSession(session.id, mainPaneId));
                        }
                        // Pane exists, just switch to it
                        return switchToSession(session.id, mainPaneId);
                      });
                  });
              })
              .then((result) => {
                if (result.success) {
                  // Update active session in store
                  useAppStore.getState().setActiveSessionId(session.id);
                } else {
                  useAppStore.getState().setError(result.error || 'Failed to switch session');
                  setTimeout(() => {
                    useAppStore.getState().setError(null);
                  }, 5000);
                }
              })
              .catch((err) => {
                useAppStore.getState().setError(`Switch failed: ${err.message}`);
                setTimeout(() => {
                  useAppStore.getState().setError(null);
                }, 5000);
              });
          } else {
            // External session: use tmux switch-client to jump to that session
            if (!session.tmuxTarget) {
              state.setError('No tmux target for session');
              setTimeout(() => {
                useAppStore.getState().setError(null);
              }, 3000);
              return;
            }

            execAsync(`tmux select-pane -t "${session.tmuxTarget}"`)
              .then(() => {
                // Update active session in store (external sessions still track as active)
                useAppStore.getState().setActiveSessionId(session.id);
              })
              .catch((err) => {
                useAppStore.getState().setError(`Jump failed: ${err.message}`);
                setTimeout(() => {
                  useAppStore.getState().setError(null);
                }, 5000);
              });
          }
        }
        return;
      }
    }

    // x to dismiss error
    if (input === 'x') {
      useAppStore.getState().setError(null);
      return;
    }

    // b to return focus to HUD (after jumping to a session)
    if (input === 'b') {
      returnToHud().then((result) => {
        if (!result.success) {
          useAppStore.getState().setError(result.hint || result.message);
          // Longer timeout for focus errors (7 seconds) to read hints
          setTimeout(() => {
            useAppStore.getState().setError(null);
          }, 7000);
        }
      });
      return;
    }

    // Handle spawn mode input
    if (spawnMode) {
      // Escape to cancel
      if (key.escape) {
        setSpawnMode(false);
        setSpawnInput('');
        return;
      }

      // Enter to spawn
      if (key.return) {
        const directory = spawnInput.trim() || process.cwd();
        setSpawnMode(false);
        setSpawnInput('');

        // Spawn Claude in the specified directory
        execAsync('tmux show-environment CLAUDE_TERMINAL_HUD_PANE')
          .then(({ stdout }) => {
            const hudPaneId = stdout.split('=')[1]?.trim();
            return execAsync(`tmux list-panes -F '#{pane_id}'`)
              .then(({ stdout: paneList }) => {
                const panes = paneList.trim().split('\n');
                const mainPaneId = panes.find(p => p !== hudPaneId) || panes[1];

                // cd to directory and run claude
                return execAsync(`tmux send-keys -t ${mainPaneId} 'cd ${directory} && claude' Enter`)
                  .then(() => execAsync(`tmux select-pane -t ${mainPaneId}`));
              });
          })
          .catch((err) => {
            useAppStore.getState().setError(`Spawn failed: ${err.message}`);
            setTimeout(() => {
              useAppStore.getState().setError(null);
            }, 5000);
          });
        return;
      }

      // Backspace to delete
      if (key.backspace || key.delete) {
        setSpawnInput(prev => prev.slice(0, -1));
        return;
      }

      // Tab to expand ~ to home directory
      if (key.tab) {
        if (spawnInput.startsWith('~')) {
          setSpawnInput(spawnInput.replace('~', process.env.HOME || '~'));
        }
        return;
      }

      // Regular character input
      if (input && !key.ctrl && !key.meta) {
        setSpawnInput(prev => prev + input);
      }
      return;
    }

    // n to enter spawn mode
    if (input === 'n') {
      setSpawnMode(true);
      setSpawnInput('');
      return;
    }

    // Normal mode key handling
    if (input === 'q') {
      setQuitMode('confirming');
    }
    if (input === '?') {
      setShowHelp(true);
    }
  });

  return (
    <Box flexDirection="column">
      <HudStrip
        showHelp={showHelp}
        error={error}
        quitMode={quitMode}
        isConfirmingExit={isConfirmingExit}
        spawnMode={spawnMode}
        spawnInput={spawnInput}
      />
    </Box>
  );
}

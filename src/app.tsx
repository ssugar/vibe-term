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
import { ensureScratchWindow } from './services/paneSessionManager.js';
import {
  expandTilde,
  directoryExists,
  createDirectory,
  getDirectoryCompletions,
} from './services/directoryService.js';

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
  const [completions, setCompletions] = useState<string[]>([]);
  const [completionIndex, setCompletionIndex] = useState(0);
  const [showMkdirPrompt, setShowMkdirPrompt] = useState(false);
  const [mkdirPath, setMkdirPath] = useState('');

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

    // Helper function to execute spawn logic
    const executeSpawn = (directory: string) => {
      setSpawnMode(false);
      setSpawnInput('');
      setCompletions([]);
      setCompletionIndex(0);
      setShowMkdirPrompt(false);
      setMkdirPath('');

      // Spawn Claude using scratch window pattern:
      // 1. Create new pane in scratch window
      // 2. Start Claude there
      // 3. Swap into main pane
      ensureScratchWindow()
        .then((scratchWindow) => {
          // Create new pane in scratch, get its ID
          return execAsync(`tmux split-window -t ${scratchWindow} -d -P -F '#{pane_id}'`)
            .then(({ stdout }) => {
              const newPaneId = stdout.trim();
              // cd to directory and start Claude (explicit cd is more reliable than -c flag)
              return execAsync(`tmux send-keys -t ${newPaneId} 'cd "${directory}" && claude' Enter`)
                .then(() => {
                  // Get main pane ID
                  return execAsync('tmux show-environment CLAUDE_TERMINAL_HUD_PANE')
                    .then(({ stdout: hudEnv }) => {
                      const hudPaneId = hudEnv.split('=')[1]?.trim();
                      return execAsync(`tmux list-panes -F '#{pane_id}'`)
                        .then(({ stdout: paneList }) => {
                          const panes = paneList.trim().split('\n');
                          const mainPaneId = panes.find(p => p !== hudPaneId) || panes[1];
                          // Swap new pane into main position
                          return execAsync(`tmux swap-pane -s ${newPaneId} -t ${mainPaneId}`)
                            .then(() => execAsync(`tmux select-pane -t ${mainPaneId}`));
                        });
                    });
                });
            });
        })
        .catch((err) => {
          useAppStore.getState().setError(`Spawn failed: ${err.message}`);
          setTimeout(() => {
            useAppStore.getState().setError(null);
          }, 5000);
        });
    };

    // Handle mkdir prompt (y/n)
    if (showMkdirPrompt) {
      if (input === 'y' || input === 'Y') {
        // Create directory and spawn
        try {
          createDirectory(mkdirPath);
          executeSpawn(mkdirPath);
        } catch (err) {
          useAppStore.getState().setError(`Failed to create directory: ${err instanceof Error ? err.message : String(err)}`);
          setTimeout(() => {
            useAppStore.getState().setError(null);
          }, 5000);
          setShowMkdirPrompt(false);
          setMkdirPath('');
        }
        return;
      }
      if (input === 'n' || input === 'N' || key.escape) {
        // Cancel
        setShowMkdirPrompt(false);
        setMkdirPath('');
        setSpawnMode(false);
        setSpawnInput('');
        setCompletions([]);
        setCompletionIndex(0);
        return;
      }
      return; // Ignore other keys during mkdir prompt
    }

    // Handle spawn mode input (before navigation to capture Enter key)
    if (spawnMode) {
      // Escape to cancel
      if (key.escape) {
        setSpawnMode(false);
        setSpawnInput('');
        setCompletions([]);
        setCompletionIndex(0);
        return;
      }

      // Enter to spawn
      if (key.return) {
        // Expand ~ to home directory (tilde doesn't expand inside quotes in bash)
        const directory = expandTilde(spawnInput.trim() || process.cwd());

        // Check if directory exists
        if (directoryExists(directory)) {
          executeSpawn(directory);
        } else {
          // Directory doesn't exist - show mkdir prompt
          setMkdirPath(directory);
          setShowMkdirPrompt(true);
        }
        return;
      }

      // Backspace to delete
      if (key.backspace || key.delete) {
        setSpawnInput(prev => prev.slice(0, -1));
        // Reset completions when input changes
        setCompletions([]);
        setCompletionIndex(0);
        return;
      }

      // Tab for directory completion
      if (key.tab) {
        if (completions.length === 0) {
          // First Tab press: get completions
          const matches = getDirectoryCompletions(spawnInput || '~');
          if (matches.length > 0) {
            setCompletions(matches);
            setCompletionIndex(0);
            setSpawnInput(matches[0]);
          }
        } else {
          // Subsequent Tab presses: cycle through completions
          const nextIndex = (completionIndex + 1) % completions.length;
          setCompletionIndex(nextIndex);
          setSpawnInput(completions[nextIndex]);
        }
        return;
      }

      // Regular character input
      if (input && !key.ctrl && !key.meta) {
        setSpawnInput(prev => prev + input);
        // Reset completions when input changes
        setCompletions([]);
        setCompletionIndex(0);
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
        } else {
          // Show error for invalid session number
          useAppStore.getState().setError(`No session ${input}`);
          setTimeout(() => {
            useAppStore.getState().setError(null);
          }, 1500);
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

          // Check if session is internal (managed by claude-terminal) or external
          if (!session.isExternal && session.paneId) {
            // Internal session: swap pane into main position using stable paneId
            execAsync('tmux show-environment CLAUDE_TERMINAL_HUD_PANE')
              .then(({ stdout }) => {
                const hudPaneId = stdout.split('=')[1]?.trim();
                // Get all panes in current window and find the main one (not HUD)
                return execAsync(`tmux list-panes -F '#{pane_id}'`)
                  .then(({ stdout: paneList }) => {
                    const panes = paneList.trim().split('\n');
                    const mainPaneId = panes.find(p => p !== hudPaneId) || panes[1];

                    // If session is already in main pane, just focus it
                    if (session.paneId === mainPaneId) {
                      return execAsync(`tmux select-pane -t ${mainPaneId}`);
                    }

                    // Swap session's pane into main position
                    return execAsync(`tmux swap-pane -s ${session.paneId} -t ${mainPaneId}`)
                      .then(() => execAsync(`tmux select-pane -t ${mainPaneId}`));
                  });
              })
              .then(() => {
                useAppStore.getState().setActiveSessionId(session.id);
              })
              .catch((err) => {
                useAppStore.getState().setError(`Switch failed: ${err.message}`);
                setTimeout(() => {
                  useAppStore.getState().setError(null);
                }, 5000);
              });
          } else {
            // External session or no paneId: use select-pane to focus directly
            const target = session.paneId || session.tmuxTarget;
            if (!target) {
              state.setError('No pane target for session');
              setTimeout(() => {
                useAppStore.getState().setError(null);
              }, 3000);
              return;
            }

            execAsync(`tmux select-pane -t "${target}"`)
              .then(() => {
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

    // n to enter spawn mode
    if (input === 'n') {
      setSpawnMode(true);
      setSpawnInput('');
      setCompletions([]);
      setCompletionIndex(0);
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
        showMkdirPrompt={showMkdirPrompt}
        mkdirPath={mkdirPath}
        completionCount={completions.length}
      />
    </Box>
  );
}

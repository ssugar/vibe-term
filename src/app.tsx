import React, { useRef, useEffect, useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { spawnSync } from 'child_process';
import { useAppStore } from './stores/appStore.js';
import { useInterval } from './hooks/useInterval.js';
import { useSessions } from './hooks/useSessions.js';
import { HudStrip } from './components/HudStrip.js';
import { jumpToSession } from './services/jumpService.js';
import { saveHudWindowId, returnToHud } from './services/windowFocusService.js';
import { TMUX_SESSION_NAME } from './startup.js';

interface AppProps {
  refreshInterval: number;
}

export default function App({ refreshInterval }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const initializedRef = useRef(false);

  // Quit mode state: 'none' | 'confirming' (shows detach/kill prompt)
  const [quitMode, setQuitMode] = useState<'none' | 'confirming'>('none');

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

      // Enter to jump to selected session
      if (key.return) {
        const state = useAppStore.getState();
        const session = state.sessions[state.selectedIndex];
        if (session) {
          jumpToSession(session).then((result) => {
            if (!result.success) {
              state.setError(result.message);
              // Auto-clear error after 7 seconds (longer for focus hints)
              setTimeout(() => {
                useAppStore.getState().setError(null);
              }, 7000);
            }
          });
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
      <HudStrip showHelp={showHelp} error={error} />

      {/* Exit confirmation overlay (for Ctrl+C emergency exit) */}
      {isConfirmingExit && (
        <Box
          position="absolute"
          marginTop={2}
          marginLeft={2}
        >
          <Box borderStyle="round" borderColor="yellow" paddingX={1}>
            <Text>Quit HUD? </Text>
            <Text bold color="green">y</Text>
            <Text>/</Text>
            <Text bold color="red">n</Text>
          </Box>
        </Box>
      )}

      {/* Quit prompt overlay (for 'q' key with detach/kill options) */}
      {quitMode === 'confirming' && (
        <Box
          position="absolute"
          marginTop={2}
          marginLeft={2}
        >
          <Box borderStyle="round" borderColor="yellow" paddingX={1}>
            <Text>Quit: </Text>
            <Text color="yellow">[d]</Text>
            <Text>etach </Text>
            <Text dimColor>| </Text>
            <Text color="red">[k]</Text>
            <Text>ill </Text>
            <Text dimColor>| </Text>
            <Text color="gray">[n/Esc]</Text>
            <Text> cancel</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

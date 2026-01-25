import React, { useRef, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { useAppStore } from './stores/appStore.js';
import { useInterval } from './hooks/useInterval.js';
import { useSessions } from './hooks/useSessions.js';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { SessionList } from './components/SessionList.js';

interface AppProps {
  refreshInterval: number;
}

export default function App({ refreshInterval }: AppProps): React.ReactElement {
  const { exit } = useApp();
  const initializedRef = useRef(false);

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

      // Number hotkeys 1-9 for quick-jump
      if (/^[1-9]$/.test(input)) {
        const targetIndex = parseInt(input, 10) - 1;
        if (targetIndex < sessions.length) {
          useAppStore.getState().setSelectedIndex(targetIndex);
        }
        return;
      }
    }

    // Normal mode key handling
    if (input === 'q') {
      setConfirmingExit(true);
    }
    if (input === '?') {
      setShowHelp(true);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header />

      <Box flexGrow={1} flexDirection="column" marginY={1}>
        <SessionList />
      </Box>

      <Footer />

      {/* Exit confirmation overlay */}
      {isConfirmingExit && (
        <Box
          position="absolute"
          marginTop={3}
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

      {/* Help overlay */}
      {showHelp && (
        <Box
          position="absolute"
          marginTop={3}
          marginLeft={2}
        >
          <Box
            borderStyle="round"
            borderColor="cyan"
            flexDirection="column"
            paddingX={2}
            paddingY={1}
          >
            <Text bold color="cyan">Keyboard Shortcuts</Text>
            <Text> </Text>
            <Text><Text dimColor>j/k</Text>    Move down/up</Text>
            <Text><Text dimColor>enter</Text>  Select session</Text>
            <Text><Text dimColor>1-9</Text>    Jump to session</Text>
            <Text><Text dimColor>q</Text>      Quit</Text>
            <Text><Text dimColor>?</Text>      Toggle help</Text>
            <Text> </Text>
            <Text dimColor>Press any key to close</Text>
          </Box>
        </Box>
      )}

      {/* Error banner */}
      {error && (
        <Box
          position="absolute"
          marginTop={0}
          marginLeft={0}
        >
          <Box borderStyle="round" borderColor="red" paddingX={1}>
            <Text color="red" bold>Error: </Text>
            <Text color="red">{error}</Text>
            <Text dimColor> (x to dismiss)</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

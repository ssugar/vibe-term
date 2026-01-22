import React from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { useAppStore } from './stores/appStore.js';
import { useInterval } from './hooks/useInterval.js';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { SessionList } from './components/SessionList.js';

interface AppProps {
  refreshInterval: number;
}

export default function App({ refreshInterval }: AppProps): React.ReactElement {
  const { exit } = useApp();

  // Store state (selective subscriptions to prevent unnecessary re-renders)
  const isConfirmingExit = useAppStore((state) => state.isConfirmingExit);
  const showHelp = useAppStore((state) => state.showHelp);
  const error = useAppStore((state) => state.error);

  // Store actions
  const setConfirmingExit = useAppStore((state) => state.setConfirmingExit);
  const setShowHelp = useAppStore((state) => state.setShowHelp);
  const setLastRefresh = useAppStore((state) => state.setLastRefresh);
  const setRefreshInterval = useAppStore((state) => state.setRefreshInterval);

  // Set refresh interval from CLI flag
  React.useEffect(() => {
    setRefreshInterval(refreshInterval);
  }, [refreshInterval, setRefreshInterval]);

  // Polling interval - updates lastRefresh every tick
  useInterval(() => {
    setLastRefresh(new Date());
    // Phase 2 will add session detection logic here
  }, refreshInterval);

  // Handle keyboard input
  useInput((input, key) => {
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

    // Normal mode key handling
    if (input === 'q') {
      setConfirmingExit(true);
    }
    if (input === '?') {
      setShowHelp(true);
    }
    // j/k navigation will be implemented in Phase 5
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

import React from 'react';
import { Box } from 'ink';
import { useAppStore } from '../stores/appStore.js';
import { EmptyState } from './EmptyState.js';

export function SessionList(): React.ReactElement {
  const sessions = useAppStore((state) => state.sessions);

  if (sessions.length === 0) {
    return <EmptyState />;
  }

  // Phase 2 will implement actual session rendering
  return (
    <Box flexDirection="column">
      {/* Session rows will go here */}
    </Box>
  );
}

import React from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';
import { TabStrip } from './TabStrip.js';

interface HudStripProps {
  showHelp: boolean;
  error: string | null;
}

/**
 * HudStrip is the top-level HUD container with:
 * - Line 1: TabStrip (always shown)
 * - Line 2: Help text OR error message OR nothing (1-line mode)
 */
export function HudStrip({ showHelp, error }: HudStripProps): React.ReactElement {
  return (
    <Box flexDirection="column" backgroundColor="#333333">
      <TabStrip />
      {showHelp && (
        <Text dimColor>
          {figures.arrowLeft}/{figures.arrowRight}: scroll | Enter: jump | j/k: nav | 1-9: quick | q: quit | ?: help
        </Text>
      )}
      {error && !showHelp && (
        <Box>
          <Text color="red">{error}</Text>
          <Text dimColor> (x to dismiss)</Text>
        </Box>
      )}
    </Box>
  );
}

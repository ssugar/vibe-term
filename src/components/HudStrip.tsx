import React from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';
import { TabStrip } from './TabStrip.js';

interface HudStripProps {
  showHelp: boolean;
  error: string | null;
  quitMode: 'none' | 'confirming';
  isConfirmingExit: boolean;
}

/**
 * HudStrip is the top-level HUD container with:
 * - Line 1: TabStrip (always shown)
 * - Line 2: Quit prompt OR Ctrl+C confirm OR help text OR error message OR nothing
 *
 * Priority for line 2 (highest to lowest):
 * 1. Quit mode (q key) - shows detach/kill options
 * 2. Exit confirmation (Ctrl+C) - shows y/n
 * 3. Help text (? key)
 * 4. Error message
 * 5. Nothing (1-line mode)
 */
export function HudStrip({ showHelp, error, quitMode, isConfirmingExit }: HudStripProps): React.ReactElement {
  // Determine what to show on line 2 (priority order)
  const showQuitPrompt = quitMode === 'confirming';
  const showExitConfirm = !showQuitPrompt && isConfirmingExit;
  const showHelpText = !showQuitPrompt && !showExitConfirm && showHelp;
  const showError = !showQuitPrompt && !showExitConfirm && !showHelpText && error;

  return (
    <Box flexDirection="column" backgroundColor="#333333">
      <TabStrip />

      {/* Quit prompt (q key) - highest priority */}
      {showQuitPrompt && (
        <Text>
          <Text color="yellow">Quit: </Text>
          <Text color="yellow" bold>[d]</Text>
          <Text>etach </Text>
          <Text dimColor>| </Text>
          <Text color="red" bold>[k]</Text>
          <Text>ill </Text>
          <Text dimColor>| </Text>
          <Text dimColor>[n/Esc] cancel</Text>
        </Text>
      )}

      {/* Exit confirmation (Ctrl+C) */}
      {showExitConfirm && (
        <Text>
          <Text color="yellow">Quit HUD? </Text>
          <Text bold color="green">y</Text>
          <Text>/</Text>
          <Text bold color="red">n</Text>
        </Text>
      )}

      {/* Help text */}
      {showHelpText && (
        <Text dimColor>
          {figures.arrowLeft}/{figures.arrowRight}: scroll | Enter: jump | j/k: nav | 1-9: quick | q: quit | ?: help
        </Text>
      )}

      {/* Error message */}
      {showError && (
        <Box>
          <Text color="red">{error}</Text>
          <Text dimColor> (x to dismiss)</Text>
        </Box>
      )}
    </Box>
  );
}

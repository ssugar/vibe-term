import React from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';
import { TabStrip } from './TabStrip.js';

interface HudStripProps {
  showHelp: boolean;
  error: string | null;
  quitMode: 'none' | 'confirming';
  isConfirmingExit: boolean;
  spawnMode?: boolean;
  spawnInput?: string;
  showMkdirPrompt?: boolean;
  mkdirPath?: string;
  completionCount?: number;
}

/**
 * HudStrip is the top-level HUD container with:
 * - Line 1: TabStrip (always shown)
 * - Line 2: Quit prompt OR Ctrl+C confirm OR help text OR error message OR nothing
 *
 * Priority for line 2 (highest to lowest):
 * 1. Mkdir prompt (directory doesn't exist)
 * 2. Spawn mode (n key)
 * 3. Quit mode (q key) - shows detach/kill options
 * 4. Exit confirmation (Ctrl+C) - shows y/n
 * 5. Help text (? key)
 * 6. Error message
 * 7. Nothing (1-line mode)
 */
export function HudStrip({
  showHelp,
  error,
  quitMode,
  isConfirmingExit,
  spawnMode,
  spawnInput,
  showMkdirPrompt,
  mkdirPath,
  completionCount = 0,
}: HudStripProps): React.ReactElement {
  // Determine what to show on line 2 (priority order)
  const showMkdir = showMkdirPrompt;
  const showSpawnPrompt = !showMkdir && spawnMode;
  const showQuitPrompt = !showMkdir && !showSpawnPrompt && quitMode === 'confirming';
  const showExitConfirm = !showMkdir && !showSpawnPrompt && !showQuitPrompt && isConfirmingExit;
  const showHelpText = !showMkdir && !showSpawnPrompt && !showQuitPrompt && !showExitConfirm && showHelp;
  const showError = !showMkdir && !showSpawnPrompt && !showQuitPrompt && !showExitConfirm && !showHelpText && error;

  return (
    <Box flexDirection="column" backgroundColor="#333333">
      <TabStrip />

      {/* Mkdir prompt (directory doesn't exist) - highest priority */}
      {showMkdir && (
        <Text>
          <Text color="yellow">Directory doesn't exist: </Text>
          <Text>{mkdirPath}</Text>
          <Text> Create? </Text>
          <Text bold color="green">[y]</Text>
          <Text>es / </Text>
          <Text bold color="red">[n]</Text>
          <Text>o</Text>
        </Text>
      )}

      {/* Spawn prompt (n key) */}
      {showSpawnPrompt && (
        <Text>
          <Text color="cyan">Directory: </Text>
          <Text>{spawnInput || ''}</Text>
          <Text backgroundColor="white"> </Text>
          <Text dimColor> (Tab: complete{completionCount > 0 ? ` [${completionCount}]` : ''} | Enter: spawn | Esc: cancel)</Text>
        </Text>
      )}

      {/* Quit prompt (q key) */}
      {showQuitPrompt && (
        <Text>
          <Text color="yellow">Quit: </Text>
          <Text color="yellow" bold>[d]</Text>
          <Text>etach </Text>
          <Text dimColor>(sessions stay) </Text>
          <Text dimColor>| </Text>
          <Text color="red" bold>[k]</Text>
          <Text>ill </Text>
          <Text dimColor>(ends all sessions) </Text>
          <Text dimColor>| </Text>
          <Text dimColor>[n/Esc]</Text>
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
          j/k/←/→: nav | Enter: switch | 1-9/Alt+N: quick | n: new | q: quit
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

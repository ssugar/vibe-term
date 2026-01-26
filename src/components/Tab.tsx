import React from 'react';
import { Text } from 'ink';
import type { Session } from '../stores/types.js';

/**
 * Status emoji mapping for visual feedback.
 * Uses Unicode characters that render correctly in terminal.
 */
const STATUS_EMOJI: Record<Session['status'], string> = {
  idle: '\u2705',      // Green checkmark
  working: '\u23F3',   // Hourglass
  tool: '\u{1F527}',   // Wrench - tool executing
  blocked: '\u{1F6D1}', // Stop sign
  ended: '\u274C',     // X mark
};

interface TabProps {
  session: Session;
  index: number;           // 1-based display index
  isSelected: boolean;
  maxNameWidth?: number;   // Default 20
}

/**
 * Get context percentage color based on usage level.
 */
function getContextColor(usage: number): 'green' | 'yellow' | 'red' {
  if (usage < 30) return 'green';
  if (usage <= 70) return 'yellow';
  return 'red';
}

/**
 * Renders a single session as a compact horizontal tab.
 * Format: [index:name status context%]
 *
 * Visual states:
 * - Blocked: red background, white text, bold
 * - Selected (non-blocked): inverse colors
 * - Normal: default colors
 */
export function Tab({ session, index, isSelected, maxNameWidth = 20 }: TabProps): React.ReactElement {
  // Extract project name from projectPath (last directory)
  const rawName = session.projectPath.split('/').pop() || 'unknown';

  // Truncate to maxNameWidth with ellipsis if needed
  const truncatedName = rawName.length > maxNameWidth
    ? rawName.slice(0, maxNameWidth - 1) + '\u2026'  // Unicode ellipsis
    : rawName;

  // Status emoji
  const statusEmoji = STATUS_EMOJI[session.status];

  // Context percentage (pad to 4 chars for consistent width: " 0%" to "100%")
  const contextPct = `${Math.round(session.contextUsage)}%`.padStart(4);
  const contextColor = getContextColor(session.contextUsage);

  // Check states
  const isBlocked = session.status === 'blocked';

  // Build tab content: [index:name status context%]
  const tabContent = `[${index}:${truncatedName} ${statusEmoji} `;

  if (isBlocked) {
    // Blocked: red background, white bold text
    return (
      <Text>
        <Text backgroundColor="red" color="white" bold>
          {tabContent}
        </Text>
        <Text backgroundColor="red" color="white" bold>
          {contextPct}
        </Text>
        <Text backgroundColor="red" color="white" bold>]</Text>
      </Text>
    );
  }

  if (isSelected) {
    // Selected: inverse colors
    return (
      <Text>
        <Text inverse>{tabContent}</Text>
        <Text inverse color={contextColor}>{contextPct}</Text>
        <Text inverse>]</Text>
      </Text>
    );
  }

  // Normal: default colors with context color
  return (
    <Text>
      <Text>{tabContent}</Text>
      <Text color={contextColor}>{contextPct}</Text>
      <Text>]</Text>
    </Text>
  );
}

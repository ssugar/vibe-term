import React from 'react';
import { Box, Text } from 'ink';

interface ContextMeterProps {
  percent: number;      // 0-100
  width?: number;       // Bar width in characters, default 12
  showPercent?: boolean; // Whether to show percentage text, default true
}

/**
 * Determines the stoplight color based on context usage percentage.
 * - Green: < 30% (plenty of room)
 * - Yellow: 30-70% (moderate usage)
 * - Red: > 70% (high usage, consider context management)
 */
function getStoplightColor(percent: number): 'green' | 'yellow' | 'red' {
  if (percent < 30) return 'green';
  if (percent < 70) return 'yellow';
  return 'red';
}

/**
 * Renders a Unicode block progress bar.
 * Uses full block (█) for filled and light shade (░) for empty.
 */
function renderProgressBar(percent: number, width: number): string {
  // Clamp percent to 0-100
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clampedPercent / 100) * width);
  const empty = width - filled;

  return '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
}

/**
 * ContextMeter: Visual progress bar showing context window usage.
 *
 * Displays a colored progress bar with percentage text:
 * - Green when under 30%
 * - Yellow when 30-70%
 * - Red when over 70%
 * - Warning indicator (!) at 90%+
 */
export function ContextMeter({
  percent,
  width = 12,
  showPercent = true
}: ContextMeterProps): React.ReactElement {
  // Clamp percent to 0-100 for display
  const clampedPercent = Math.max(0, Math.min(100, percent));

  const color = getStoplightColor(clampedPercent);
  const bar = renderProgressBar(clampedPercent, width);
  const percentText = `${Math.round(clampedPercent)}%`;

  // Show warning indicator at 90%+
  const showWarning = clampedPercent >= 90;

  return (
    <Box>
      {showWarning && <Text color="red" bold>!</Text>}
      <Text color={color}>{bar}</Text>
      {showPercent && <Text color={color}> {percentText.padStart(4)}</Text>}
    </Box>
  );
}

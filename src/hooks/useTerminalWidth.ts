import { useState, useEffect } from 'react';

/**
 * Hook that provides terminal width and reacts to resize events.
 * Falls back to 80 columns if process.stdout.columns is undefined.
 */
export function useTerminalWidth(): number {
  const [width, setWidth] = useState(process.stdout.columns || 80);

  useEffect(() => {
    const handleResize = (): void => {
      setWidth(process.stdout.columns || 80);
    };

    process.stdout.on('resize', handleResize);

    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  return width;
}

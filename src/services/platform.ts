import { exec } from 'child_process';
import { promisify } from 'util';
import { platform, release } from 'os';

/**
 * Supported platforms for the application
 */
export type Platform = 'linux' | 'macos' | 'wsl2';

/**
 * Detect the current platform.
 * Returns 'linux', 'macos', or 'wsl2'.
 * Throws error for unsupported platforms (e.g., Windows native).
 */
export function detectPlatform(): Platform {
  const plat = platform();
  if (plat === 'darwin') return 'macos';
  if (plat === 'linux') {
    // Check for WSL2 by examining the kernel release string
    const rel = release().toLowerCase();
    if (rel.includes('microsoft') || rel.includes('wsl')) {
      return 'wsl2';
    }
    return 'linux';
  }
  throw new Error(`Unsupported platform: ${plat}`);
}

// Promisified exec with increased maxBuffer
const execPromise = promisify(exec);

/**
 * Execute a shell command asynchronously with 5MB buffer.
 * This prevents buffer overflow for commands with large output.
 */
export async function execAsync(
  command: string
): Promise<{ stdout: string; stderr: string }> {
  return execPromise(command, { maxBuffer: 5 * 1024 * 1024 });
}

/**
 * Get the current working directory for a process by PID.
 * Returns null if the process doesn't exist or cwd can't be determined.
 *
 * Linux/WSL2: Uses /proc filesystem (readlink)
 * macOS: Uses lsof command
 */
export async function getProcessCwd(pid: number): Promise<string | null> {
  const plat = detectPlatform();
  try {
    if (plat === 'linux' || plat === 'wsl2') {
      // Fast /proc filesystem access
      const { stdout } = await execAsync(`readlink /proc/${pid}/cwd`);
      return stdout.trim() || null;
    } else {
      // macOS uses lsof
      const { stdout } = await execAsync(
        `lsof -p ${pid} | awk '/cwd/{ print $9 }'`
      );
      return stdout.trim() || null;
    }
  } catch {
    // Process may have exited or we don't have permission
    return null;
  }
}

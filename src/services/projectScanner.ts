import { readdir, readFile, access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import micromatch from 'micromatch';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

export interface DiscoveredProject {
  encodedName: string;        // Directory name in ~/.claude/projects/
  originalPath: string;       // Actual project path from sessions-index.json
  settingsPath: string | null;      // Path to .claude/settings.json if exists
  localSettingsPath: string | null; // Path to .claude/settings.local.json if exists
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Discover all Claude projects from ~/.claude/projects/
 * Reads sessions-index.json from each project directory to get the original path
 * Skips directories without valid sessions-index.json
 */
export async function discoverProjects(): Promise<DiscoveredProject[]> {
  const entries = await readdir(CLAUDE_PROJECTS_DIR, { withFileTypes: true });
  const projects: DiscoveredProject[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const sessionsIndexPath = join(CLAUDE_PROJECTS_DIR, entry.name, 'sessions-index.json');
    try {
      const content = await readFile(sessionsIndexPath, 'utf-8');
      const index = JSON.parse(content) as { originalPath?: string };
      if (index.originalPath) {
        const projectSettingsPath = join(index.originalPath, '.claude', 'settings.json');
        const localSettingsPath = join(index.originalPath, '.claude', 'settings.local.json');

        projects.push({
          encodedName: entry.name,
          originalPath: index.originalPath,
          settingsPath: await fileExists(projectSettingsPath) ? projectSettingsPath : null,
          localSettingsPath: await fileExists(localSettingsPath) ? localSettingsPath : null,
        });
      }
    } catch {
      // Skip directories without valid sessions-index.json
      continue;
    }
  }

  return projects;
}

/**
 * Filter projects by glob pattern matching originalPath
 * If pattern is undefined, returns all projects
 */
export function filterByPattern(
  projects: DiscoveredProject[],
  pattern?: string
): DiscoveredProject[] {
  if (!pattern) return projects;

  // Match against originalPath
  const paths = projects.map(p => p.originalPath);
  const matches = micromatch(paths, pattern);

  return projects.filter(p => matches.includes(p.originalPath));
}

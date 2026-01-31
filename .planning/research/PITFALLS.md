# Pitfalls Research: v3.0 Hook Management and npm Distribution

**Domain:** CLI tool with npm global install, hook management, and user config directory
**Researched:** 2026-01-30
**Confidence:** HIGH (verified with npm docs, Claude Code issue trackers, and ecosystem best practices)

---

## Critical Pitfalls

### Pitfall 1: Claude Code Settings Replace Instead of Merge

**Symptom:** After adding hooks to a project's `.claude/settings.json`, the global hooks from `~/.claude/settings.json` stop running for that project.

**Cause:** Claude Code settings apply in order of precedence, and project-level settings can **replace** rather than merge with global settings. This is a known issue tracked in [GitHub #17017](https://github.com/anthropics/claude-code/issues/17017) and [#11626](https://github.com/anthropics/claude-code/issues/11626).

**Warning Signs:**
- vibe-term stops tracking sessions in projects that have their own `.claude/settings.json`
- User adds any hook to a project and vibe-term hooks silently stop working
- Works for new projects but breaks for configured ones

**Consequences:**
- Silent failure - no error message, just missing session tracking
- User confusion about why some projects work and others don't
- Support burden explaining Claude Code's merge behavior

**Prevention:**
- The `add-hud-hooks.sh` approach is correct - hooks must be added to each project's settings file individually
- Document this limitation clearly in README
- Provide tooling that scans for and updates all project settings files
- Consider a `vibe-term setup` command that handles both global and project-level hook installation
- Detect when a session is missing hook data and warn user about potential project-level override

**Detection:**
```typescript
// In session detection, flag sessions without recent hook updates
const SESSION_STALE_THRESHOLD = 30000; // 30 seconds
if (Date.now() - session.lastHookUpdate > SESSION_STALE_THRESHOLD && session.status !== 'idle') {
  session.mayBeMissingHooks = true;
}
```

**Phase:** Hook Management - must handle project-level hook injection

**Sources:**
- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings)
- [Project-level permissions replace global permissions #17017](https://github.com/anthropics/claude-code/issues/17017)
- [Feature request: Automatic merge #11626](https://github.com/anthropics/claude-code/issues/11626)

---

### Pitfall 2: Hook Array Deduplication Logic Wrong

**Symptom:** After running hook installation multiple times, the same hook appears duplicated in settings files, causing the hook to run multiple times per event.

**Cause:** Naive array concatenation without proper deduplication. The existing `add-hud-hooks.sh` checks for existing hooks but uses string matching that may miss variations.

**Warning Signs:**
- Hook script runs 2x, 3x, 4x per Claude event
- Session state files updated multiple times in rapid succession
- Slower Claude response due to redundant hook execution

**Consequences:**
- Performance degradation for users
- Confusing state updates in HUD
- User has to manually edit settings.json to fix

**Prevention:**
```typescript
// Check for hook existence by normalized command path
function hookExists(hooks: HookEntry[], targetCommand: string): boolean {
  const normalizedTarget = normalizePath(targetCommand);
  return hooks.some(entry =>
    entry.hooks.some(hook =>
      normalizePath(hook.command) === normalizedTarget ||
      hook.command.includes('status-hook.sh') // Catch variations
    )
  );
}

function normalizePath(cmd: string): string {
  // Handle $CLAUDE_PROJECT_DIR, ~, absolute paths
  return cmd
    .replace(/^"?\$CLAUDE_PROJECT_DIR"?/, '')
    .replace(/^"?~/, '')
    .replace(/\/+/g, '/')
    .trim();
}
```

**Phase:** Hook Management - implement robust deduplication before adding hooks

**Sources:**
- [deepmerge npm package](https://www.npmjs.com/package/deepmerge) - for array merge strategies
- Existing `add-hud-hooks.sh` in project

---

### Pitfall 3: npm Global Install Path Resolution Breaks Hook Scripts

**Symptom:** After `npm install -g vibe-term`, hook scripts fail with "command not found" or wrong path errors.

**Cause:** When installed globally, the package is in a different location than when cloned and built locally. Hardcoded paths like `/home/user/claude/vibe-term/src/hooks/status-hook.sh` break.

**Warning Signs:**
- Hooks work during development but fail after npm install
- Error in Claude output: "status-hook.sh: No such file or directory"
- Works on one machine, fails on another

**Consequences:**
- Complete loss of session tracking for globally installed users
- Silent failure (hook errors don't stop Claude)
- User must manually fix paths

**Prevention:**
```typescript
// Use import.meta.dirname (Node 20.11+) for package location
const packageRoot = import.meta.dirname; // or fileURLToPath(import.meta.url)
const hookScript = path.join(packageRoot, 'hooks', 'status-hook.sh');

// During hook installation, use the resolved absolute path
function getHookCommand(): string {
  const hookPath = path.join(getPackageRoot(), 'dist', 'hooks', 'status-hook.sh');
  // Verify it exists before returning
  if (!fs.existsSync(hookPath)) {
    throw new Error(`Hook script not found at ${hookPath}. Reinstall vibe-term.`);
  }
  return hookPath;
}
```

**Additional consideration:** The hook script must be included in the npm package's `files` array in package.json:
```json
{
  "files": ["dist", "dist/hooks/status-hook.sh"]
}
```

**Phase:** npm Distribution - resolve paths relative to package installation location

**Sources:**
- [ESM __dirname alternatives](https://blog.logrocket.com/alternatives-dirname-node-js-es-modules/)
- [npm folders documentation](https://docs.npmjs.com/cli/v7/configuring-npm/folders/)
- [import.meta.dirname in Node.js](https://www.sonarsource.com/blog/dirname-node-js-es-modules/)

---

### Pitfall 4: Backup Files Left Behind Without Restoration Path

**Symptom:** User runs `vibe-term setup`, something goes wrong mid-process, and their `settings.json` is corrupted. Backup files exist but user doesn't know how to restore.

**Cause:** Backup files created with timestamps like `settings.json.backup-1768763003544` but no `vibe-term restore` command or clear documentation on restoration.

**Warning Signs:**
- Multiple `.backup-*` files accumulating in ~/.claude/
- User reports "Claude stopped working after running vibe-term setup"
- No way to undo hook installation

**Consequences:**
- User loses their Claude configuration
- Trust eroded - tool modifies critical config without safe undo
- Support burden for manual recovery

**Prevention:**
```typescript
// Clear backup naming convention with human-readable timestamp
const backupName = `settings.json.vibe-term-backup.${new Date().toISOString().replace(/[:.]/g, '-')}`;

// Create manifest of what was backed up
const manifest = {
  backupFile: backupPath,
  originalFile: settingsPath,
  createdAt: new Date().toISOString(),
  createdBy: 'vibe-term setup',
  restoreCommand: 'vibe-term restore --backup ' + backupName
};

// Implement restore command
async function restore(backupPath: string): Promise<void> {
  const backup = await fs.readFile(backupPath, 'utf8');
  // Validate it's valid JSON before overwriting
  JSON.parse(backup);
  await fs.copyFile(backupPath, settingsPath);
  console.log(`Restored settings from ${backupPath}`);
}
```

**Best practices:**
- Keep only last N backups (e.g., 5) to avoid clutter
- Name backups with purpose: `settings.json.vibe-term-backup.YYYY-MM-DDTHH-MM-SS`
- Provide `vibe-term restore` command
- Show backup location after any settings modification
- Use atomic write (write-file-atomic) to prevent corruption

**Phase:** Hook Management - implement backup strategy with restoration command

**Sources:**
- [write-file-atomic npm package](https://www.npmjs.com/package/write-file-atomic)
- Existing backup files in ~/.claude/: `settings.json.backup-*`

---

### Pitfall 5: EACCES Permission Errors on npm Global Install

**Symptom:** `npm install -g vibe-term` fails with EACCES or requires sudo, which breaks subsequent operations.

**Cause:** Default npm global directory (`/usr/local/lib/node_modules`) requires root permissions on many systems. Using sudo creates files owned by root that the user can't modify.

**Warning Signs:**
- `EACCES: permission denied` during install
- User runs `sudo npm install -g` and then hook scripts fail with permission errors
- Symlink creation fails for bin scripts

**Consequences:**
- Users unable to install without workarounds
- Using sudo creates downstream permission problems
- Different behavior across Linux, macOS, Windows

**Prevention:**
- Document recommended installation methods in README
- Recommend using nvm or changing npm prefix to user directory
- Test installation in CI on fresh systems without sudo
- Don't require write access to system directories at runtime

```markdown
## Installation

### Recommended: Use nvm (avoids permission issues)
```bash
nvm install 20
npm install -g vibe-term
```

### Alternative: Configure npm to use user directory
```bash
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
npm install -g vibe-term
```
```

**Phase:** npm Distribution - document installation without sudo

**Sources:**
- [npm EACCES permission errors](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally/)
- [npm permission notes](https://npm.github.io/installation-setup-docs/installing/a-note-on-permissions.html)

---

## Moderate Pitfalls

### Pitfall 6: ~/.vibe-term/ Directory Permission and Structure Issues

**Symptom:** Hook script or vibe-term fails to write session state files. Files end up in wrong location or with wrong permissions.

**Cause:** No consistent handling of config/data directory creation. Different code paths create directories with different permissions or in different locations.

**Warning Signs:**
- Session state files missing despite hooks running
- Permission denied writing to ~/.vibe-term/
- Directory structure inconsistent across machines

**Prevention:**
```typescript
// Use env-paths for cross-platform config locations
import envPaths from 'env-paths';

const paths = envPaths('vibe-term', { suffix: '' });
// paths.config -> ~/.config/vibe-term (Linux) or ~/Library/Preferences/vibe-term (macOS)
// paths.data -> ~/.local/share/vibe-term
// paths.cache -> ~/.cache/vibe-term

// Centralize directory creation
async function ensureDirectories(): Promise<void> {
  await fs.mkdir(paths.config, { recursive: true, mode: 0o755 });
  await fs.mkdir(path.join(paths.data, 'sessions'), { recursive: true, mode: 0o755 });
}

// Call on startup AND in hook script
```

**Note:** Current implementation uses `~/.claude-hud/sessions/` - consider migrating to `~/.config/vibe-term/` for standards compliance, but provide migration path.

**Phase:** Hook Management - standardize directory structure

**Sources:**
- [env-paths npm package](https://www.npmjs.com/package/env-paths)
- [XDG Base Directory specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)

---

### Pitfall 7: Encoded Path Names in ~/.claude/projects/ Mishandled

**Symptom:** vibe-term can't find or modify settings for projects because it doesn't understand the path encoding scheme.

**Cause:** Claude Code encodes project paths like `/home/ssugar/claude/vibe-term` as `-home-ssugar-claude-vibe-term` in `~/.claude/projects/`. Tool needs to handle this encoding/decoding.

**Warning Signs:**
- Project settings scanner misses some projects
- Hook installation targets wrong directory
- Path matching fails for project detection

**Prevention:**
```typescript
// Encode path to Claude's format
function encodeProjectPath(absolutePath: string): string {
  return absolutePath.replace(/\//g, '-');
}

// Decode Claude's format to path
function decodeProjectPath(encoded: string): string {
  // First character is always '-' representing root '/'
  return encoded.replace(/-/g, '/');
}

// Find project settings for a given working directory
function findProjectSettings(cwd: string): string | null {
  const encoded = encodeProjectPath(cwd);
  const projectDir = path.join(os.homedir(), '.claude', 'projects', encoded);
  const settingsPath = path.join(projectDir, 'settings.json');
  return fs.existsSync(settingsPath) ? settingsPath : null;
}
```

**Phase:** Hook Management - handle Claude's path encoding scheme

**Sources:**
- Observed from `ls ~/.claude/projects/` showing encoded names

---

### Pitfall 8: Shebang Line Issues for Cross-Platform bin Scripts

**Symptom:** CLI command fails on some systems with "bad interpreter" or doesn't execute at all on Windows.

**Cause:** Shebang line `#!/usr/bin/env node` works on most systems but can fail. Windows handles shebangs differently through npm's cmd shim.

**Warning Signs:**
- Works on macOS/Linux but fails on WSL2 with certain configurations
- `node\r` error (Windows line endings in shebang)
- Permission denied on the bin script itself

**Prevention:**
```typescript
// In package.json, ensure correct bin entry
{
  "bin": {
    "vibe-term": "./dist/cli.js"
  }
}

// In cli.js, use standard shebang with Unix line endings
#!/usr/bin/env node

// Ensure build process outputs Unix line endings
// In tsup.config.ts or build script:
// - Don't use git autocrlf on the built output
// - Verify with: file dist/cli.js (should say "ASCII text executable")
```

**Additional checks:**
- Ensure cli.js has executable permission in git: `git update-index --chmod=+x dist/cli.js`
- Or add in package.json scripts: `"postinstall": "chmod +x dist/cli.js"` (Unix only)

**Phase:** npm Distribution - validate shebang and permissions

**Sources:**
- [Creating cross-platform shell scripts](https://exploringjs.com/nodejs-shell-scripting/ch_creating-shell-scripts.html)
- [Cross-platform Node.js](https://alan.norbauer.com/articles/cross-platform-nodejs/)

---

### Pitfall 9: Hook Script Dependency on jq Not Available

**Symptom:** Status hook fails silently because `jq` command is not installed on user's system.

**Cause:** Current `status-hook.sh` depends on `jq` for JSON parsing. Not all systems have jq installed by default.

**Warning Signs:**
- Hook runs but produces no output files
- `jq: command not found` in stderr (but hooks suppress errors)
- Works on dev machine, fails on user's machine

**Prevention:**

Option A: Rewrite hook in Node.js (consistent with rest of project):
```typescript
#!/usr/bin/env node
// status-hook.js - no external dependencies beyond Node
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const input = JSON.parse(readFileSync(0, 'utf8')); // Read from stdin
// ... rest of hook logic
```

Option B: Keep bash but use pure bash JSON parsing (fragile) or bundle jq.

**Recommendation:** Rewrite hook in Node.js. It's already a Node project, and Node is guaranteed available if vibe-term is installed.

**Phase:** Hook Management - remove jq dependency

**Sources:**
- Current `src/hooks/status-hook.sh` uses jq extensively

---

### Pitfall 10: npm link vs npm install -g Behavior Differences

**Symptom:** Package works when tested with `npm link` but fails when user does `npm install -g`.

**Cause:** `npm link` creates a symlink to your source directory, while `npm install -g` copies files to global node_modules. Paths, file permissions, and which files are included can differ.

**Warning Signs:**
- "File not found" for files that exist in source but aren't in package
- Different behavior between dev testing and user installation
- Works with `npm link`, breaks with `npm pack && npm install -g ./vibe-term-*.tgz`

**Prevention:**
```bash
# Test the actual package, not symlinked source
npm pack                           # Creates vibe-term-1.0.0.tgz
npm install -g ./vibe-term-1.0.0.tgz  # Install from tarball
vibe-term                          # Test the installed version

# Verify package contents include all needed files
tar -tvf vibe-term-1.0.0.tgz | grep -E '\.(js|sh)$'
```

```json
// package.json - explicit files array
{
  "files": [
    "dist/**/*.js",
    "dist/**/*.sh",
    "dist/**/*.d.ts"
  ]
}
```

**Phase:** npm Distribution - test with npm pack, not just npm link

**Sources:**
- [npm link documentation](https://docs.npmjs.com/cli/v9/commands/npm-link/)
- [Different approaches to testing local packages](https://dev.to/one-beyond/different-approaches-to-testing-your-own-packages-locally-npm-link-4hoj)

---

## Minor Pitfalls

### Pitfall 11: Multiple Hook Events Cause State Race Conditions

**Symptom:** Session status flickers or shows wrong state because multiple hook events fire rapidly and race to update state file.

**Cause:** `PreToolUse`, `PostToolUse`, and other hooks can fire in rapid succession. Each reads then writes the state file, potentially losing updates.

**Warning Signs:**
- Status shows "tool" then immediately "idle" then back to "working"
- Subagent count goes negative or jumps unexpectedly
- `lastUpdate` timestamp jumps backward

**Prevention:**
```typescript
// Use atomic file operations with locking
import { writeFile } from 'write-file-atomic';

// Or use a simple mutex for the state file
const lockFile = `${stateFile}.lock`;

async function updateState(sessionId: string, updates: Partial<SessionState>) {
  await acquireLock(lockFile);
  try {
    const current = await readState(sessionId);
    const merged = { ...current, ...updates, lastUpdate: Date.now() };
    await writeFile(stateFile, JSON.stringify(merged, null, 2));
  } finally {
    await releaseLock(lockFile);
  }
}
```

**Current mitigation in status-hook.sh:** Uses temp file + mv which is atomic for the write, but reads can still race. Consider adding file locking or accepting eventual consistency.

**Phase:** Hook Management - consider atomic state updates

---

### Pitfall 12: Settings.json Formatting Lost After Modification

**Symptom:** After vibe-term modifies settings.json, the file formatting changes (different indentation, key order changes, comments lost).

**Cause:** JSON.parse/JSON.stringify doesn't preserve formatting. JSON doesn't support comments, so any commented settings are lost.

**Warning Signs:**
- User's carefully formatted settings.json becomes minified or differently indented
- Comments in settings.json disappear
- Git shows large diff for small logical change

**Prevention:**
```typescript
// Preserve formatting with json5 or detect-indent
import detectIndent from 'detect-indent';

async function updateSettingsFile(filePath: string, updater: (obj: any) => any) {
  const content = await fs.readFile(filePath, 'utf8');
  const indent = detectIndent(content).indent || '  ';

  const settings = JSON.parse(content);
  const updated = updater(settings);

  await writeFile(filePath, JSON.stringify(updated, null, indent) + '\n');
}

// Note: Comments cannot be preserved with standard JSON.
// Document that settings files should not contain comments if using vibe-term setup.
```

**Phase:** Hook Management - preserve user's JSON formatting

---

### Pitfall 13: postinstall Scripts Security Perception

**Symptom:** Security-conscious users refuse to install because postinstall scripts are a known attack vector.

**Cause:** npm postinstall scripts run arbitrary code during installation. Many security guides recommend `--ignore-scripts`. vibe-term may need postinstall to set permissions.

**Warning Signs:**
- Users ask "why does this need a postinstall script?"
- Installation fails for users with `ignore-scripts=true` in .npmrc
- Security scanners flag the package

**Prevention:**
- Avoid postinstall scripts if possible
- If needed for chmod, document why and keep it minimal:
```json
{
  "scripts": {
    "postinstall": "node -e \"require('fs').chmodSync('dist/hooks/status-hook.sh', 0o755)\""
  }
}
```
- Provide manual setup instructions for users who block scripts
- Never do network requests or complex operations in postinstall

**Phase:** npm Distribution - minimize or eliminate postinstall

**Sources:**
- [npm security best practices](https://github.com/lirantal/npm-security-best-practices)
- [OWASP npm security cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html)

---

### Pitfall 14: Version Mismatch Between CLI and Hooks

**Symptom:** User updates vibe-term but hooks still point to old version, causing compatibility issues.

**Cause:** Hook paths are written to settings.json as absolute paths. Updating the npm package doesn't update those paths.

**Warning Signs:**
- New vibe-term features don't work after upgrade
- Hook script errors after update
- State file format mismatch

**Prevention:**
```typescript
// Check hook version on startup
async function validateHookVersion(): Promise<void> {
  const expectedVersion = packageJson.version;
  const installedHookPath = await getInstalledHookPath();

  if (!installedHookPath) {
    console.warn('Hooks not installed. Run: vibe-term setup');
    return;
  }

  const hookVersion = await getHookVersion(installedHookPath);
  if (hookVersion !== expectedVersion) {
    console.warn(`Hook version mismatch: ${hookVersion} vs ${expectedVersion}`);
    console.warn('Run: vibe-term setup --upgrade');
  }
}

// Embed version in hook script
// In status-hook.sh header:
# VIBE_TERM_HOOK_VERSION=1.0.0
```

**Phase:** Hook Management - detect and warn about version mismatches

---

## Integration Pitfalls

### Pitfall 15: Interaction with Other Claude Hooks

**Symptom:** vibe-term hooks interfere with user's existing hooks, or other hooks interfere with vibe-term.

**Cause:** Multiple hooks on same event run in array order. If a hook fails or produces output, it might affect subsequent hooks.

**Warning Signs:**
- User's existing hooks stop working after installing vibe-term
- vibe-term hooks don't run when user has other hooks configured
- Unexpected CLAUDE_PAYLOAD corruption

**Prevention:**
```bash
# In hook script: Never modify environment for subsequent hooks
# Always exit 0 to not block other hooks
# Don't write to stdout (it goes to Claude)
# Write errors to stderr sparingly

#!/bin/bash
# Redirect all output to avoid affecting Claude or other hooks
exec 2>/dev/null  # Suppress stderr
exec 1>/dev/null  # Suppress stdout (restore if needed for debugging)

# ... hook logic ...

exit 0  # Always exit cleanly
```

**Phase:** Hook Management - ensure hooks are well-behaved citizens

---

### Pitfall 16: tmux Integration Conflicts with Hook File Paths

**Symptom:** Session state files are created but vibe-term running in tmux can't find them because paths resolve differently.

**Cause:** The hook runs in Claude's context (with $HOME set), but vibe-term might be in a different environment. If using tmux with different users or containers, $HOME might differ.

**Warning Signs:**
- Sessions show as "unknown" status despite hooks running
- State files appear in unexpected location
- Works outside tmux, fails inside

**Prevention:**
```typescript
// Use absolute path consistently
const stateDir = path.join(os.homedir(), '.claude-hud', 'sessions');
// Don't rely on $HOME environment variable in string interpolation

// In hook script, be explicit:
STATE_DIR="${HOME}/.claude-hud/sessions"
# Not: STATE_DIR="~/.claude-hud/sessions" (tilde doesn't expand in all contexts)
```

**Phase:** Hook Management - use absolute paths consistently

---

## Prevention Strategy Summary by Phase

### Phase: Hook Management
| Pitfall | Priority | Prevention |
|---------|----------|------------|
| Settings replace not merge (#1) | Critical | Document, provide per-project installation |
| Array deduplication (#2) | Critical | Normalize paths, check for variations |
| jq dependency (#9) | Moderate | Rewrite hook in Node.js |
| Backup and restore (#4) | Moderate | Named backups, restore command |
| Version mismatch (#14) | Minor | Embed version, check on startup |
| JSON formatting (#12) | Minor | Detect and preserve indent |
| Hook interactions (#15) | Minor | Silent, exit 0, no stdout |
| Path encoding (#7) | Moderate | Handle Claude's `-` encoding scheme |
| State races (#11) | Minor | Atomic writes, accept eventual consistency |

### Phase: npm Distribution
| Pitfall | Priority | Prevention |
|---------|----------|------------|
| Path resolution (#3) | Critical | Use import.meta.dirname, include files |
| EACCES permissions (#5) | Critical | Document nvm, no-sudo installation |
| link vs install -g (#10) | Moderate | Test with npm pack |
| Shebang issues (#8) | Moderate | Unix line endings, chmod |
| postinstall security (#13) | Minor | Minimize or document necessity |

### Phase: Config Directory
| Pitfall | Priority | Prevention |
|---------|----------|------------|
| Directory permissions (#6) | Moderate | Use env-paths, ensure on startup |
| tmux path conflicts (#16) | Minor | Absolute paths, explicit $HOME |

---

## Quality Checklist

Before shipping v3.0:

- [ ] Hook installation works for globally installed package (`npm install -g`)
- [ ] Hook installation handles projects with existing `.claude/settings.json`
- [ ] No duplicate hooks after running setup multiple times
- [ ] Backup files created with clear naming, restore command works
- [ ] Hook script runs without jq dependency
- [ ] Works without sudo during installation
- [ ] `npm pack && npm install -g` test passes
- [ ] Path resolution works from any working directory
- [ ] Session state directory created with correct permissions
- [ ] Claude's encoded project paths handled correctly
- [ ] Existing user hooks not disrupted
- [ ] Version mismatch between CLI and hooks detected and warned

---

## Sources Summary

### Primary (HIGH confidence)
- [npm documentation](https://docs.npmjs.com/) - Install, publish, permissions
- [Claude Code settings](https://code.claude.com/docs/en/settings) - Hook configuration
- [GitHub anthropics/claude-code issues](https://github.com/anthropics/claude-code/issues) - Known merge behavior issues

### Secondary (MEDIUM confidence)
- [write-file-atomic](https://www.npmjs.com/package/write-file-atomic) - Atomic file writes
- [env-paths](https://www.npmjs.com/package/env-paths) - Cross-platform config directories
- [deepmerge](https://www.npmjs.com/package/deepmerge) - JSON merge strategies
- [Node.js ESM documentation](https://nodejs.org/api/esm.html) - import.meta.dirname

### Verified from Codebase
- Existing `status-hook.sh` - Current hook implementation
- Existing `add-hud-hooks.sh` - Current project scanner
- `~/.claude/projects/` structure - Path encoding scheme
- `~/.claude/settings.json` - Global hook configuration

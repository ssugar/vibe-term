# Phase 17: Distribution & Documentation - Research

**Researched:** 2026-02-02
**Domain:** npm package publishing, CLI distribution, documentation
**Confidence:** HIGH

## Summary

This phase covers npm package configuration for global CLI installation and README documentation. The primary technical challenges are: (1) configuring package.json correctly for a TypeScript/ESM CLI tool, (2) ensuring the `files` field creates a minimal package, and (3) writing effective documentation for a tmux-dependent tool.

The project already has most configuration in place. The existing package.json has the correct `bin` field, `type: "module"`, and `engines` constraint. The main work is adding the `files` field for minimal package size and rewriting the README to match the decided structure (TUI-focused description, screenshot, installation, commands, hook workflow).

**Primary recommendation:** Add `"files": ["dist"]` to package.json, add `prepublishOnly` script for build verification, and rewrite README with the decided structure.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| npm | 10.x | Package manager/registry | Official Node.js package distribution |
| tsup | 8.5.1 | TypeScript bundler | Already in use; handles shebang, ESM output |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| npm pack | (built-in) | Test package before publish | Pre-publish validation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `files` field | `.npmignore` | files is whitelist (safer), npmignore is blacklist (riskier) |
| `npm pack` testing | `yalc` | yalc is nicer DX but adds dependency; npm pack is built-in |

**Installation:** No additional packages needed - all tooling already in place.

## Architecture Patterns

### Package.json Configuration Pattern

**What:** Configure package.json for minimal, correct npm distribution
**When to use:** Any npm package publication

**Example:**
```json
// Source: npm docs, verified via official documentation
{
  "name": "vibe-term",
  "version": "1.0.0",
  "description": "Terminal HUD for managing Claude Code sessions",
  "type": "module",
  "main": "dist/cli.js",
  "bin": {
    "vibe-term": "dist/cli.js"
  },
  "files": [
    "dist"
  ],
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "tsup src/cli.tsx --format esm --dts",
    "prepublishOnly": "npm run build"
  }
}
```

### README Structure Pattern (CLI Tool)

**What:** README organization for CLI tools
**When to use:** npm packages with CLI entry points

**Structure:**
```
1. Title + one-line description
2. Screenshot (TUI visual)
3. Installation (npm install -g)
4. Prerequisites (Node.js, tmux)
5. Quick start (basic command)
6. Commands reference (setup, audit, fix)
7. Hook workflow explanation
8. Troubleshooting
9. License
```

### Anti-Patterns to Avoid

- **Using .npmignore without .gitignore awareness:** If .npmignore exists, .gitignore is ignored entirely for package inclusion. The `files` field is safer because it's a whitelist.
- **Including source files in package:** Increases install size, provides no benefit for CLI tools.
- **Omitting prepublishOnly script:** Risk of publishing without building.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Package testing | Manual file inspection | `npm pack` + tar inspection | Shows exact package contents |
| Shebang injection | Manual file editing | tsup (already handles it) | tsup auto-detects shebang in source |
| Version bumping | Manual edits | `npm version` command | Handles git tags, package.json updates |

**Key insight:** npm provides built-in tooling for all package lifecycle operations. Use `npm pack` to test, `npm version` to bump, `npm publish` to release.

## Common Pitfalls

### Pitfall 1: Publishing Without Building
**What goes wrong:** Package published with stale dist/ contents
**Why it happens:** Developer forgets to run build before publish
**How to avoid:** Add `"prepublishOnly": "npm run build"` to scripts
**Warning signs:** CLI breaks on fresh install

### Pitfall 2: Including Unnecessary Files
**What goes wrong:** Package is 10x larger than needed
**Why it happens:** No `files` field means everything not in .gitignore is included
**How to avoid:** Add explicit `"files": ["dist"]` to package.json
**Warning signs:** Large install size, source files visible in node_modules

### Pitfall 3: Incorrect Shebang for ESM
**What goes wrong:** "cannot use import statement outside a module" error
**Why it happens:** Node doesn't recognize file as ESM without package.json context
**How to avoid:** Ensure package has `"type": "module"` (already present)
**Warning signs:** Works in dev, fails after global install

### Pitfall 4: Permission Errors on Global Install
**What goes wrong:** EACCES permission denied during npm install -g
**Why it happens:** npm's default global directory requires sudo on some systems
**How to avoid:** Document nvm usage or npm prefix configuration in troubleshooting
**Warning signs:** Users reporting "permission denied" in issues

### Pitfall 5: tmux Not Found on PATH
**What goes wrong:** vibe-term fails to start, reports tmux missing
**Why it happens:** tmux not installed or not on PATH (especially WSL2)
**How to avoid:** Document tmux installation for each platform in README
**Warning signs:** "tmux not found" or "command not found: tmux"

### Pitfall 6: Publishing Sensitive Information
**What goes wrong:** Credentials, API keys, or personal paths in published package
**Why it happens:** .gitignore doesn't protect npm publish by default
**How to avoid:** Use `files` whitelist; run `npm pack` and inspect before publish
**Warning signs:** .env files, settings.local.json in package

## Code Examples

### Minimal package.json Files Field
```json
// Source: npm docs - https://docs.npmjs.com/cli/v10/configuring-npm/package-json
{
  "files": [
    "dist"
  ]
}
```
This includes only the dist directory. README.md, package.json, and LICENSE are always included automatically.

### prepublishOnly Script
```json
// Source: npm docs - https://docs.npmjs.com/cli/v8/using-npm/scripts
{
  "scripts": {
    "prepublishOnly": "npm run build"
  }
}
```
Runs ONLY before `npm publish`, not before `npm install`. Ensures fresh build.

### Testing with npm pack
```bash
# Source: npm docs and community best practices
# Build first
npm run build

# Create tarball (same as publish would create)
npm pack

# Inspect contents
tar -tzf vibe-term-1.0.0.tgz

# Test install in another directory
cd /tmp && npm install ~/code/vibe-term/vibe-term-1.0.0.tgz
vibe-term --help
```

### README Screenshot Placement
```markdown
# vibe-term

Terminal HUD for managing Claude Code sessions.

![vibe-term TUI](./docs/screenshot.png)

## Installation
...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| npm classic tokens | OIDC trusted publishing / Granular tokens | Dec 2025 | Classic tokens revoked; new tokens expire in 90 days |
| CommonJS packages | ESM packages with `"type": "module"` | 2020-2024 | Node 20+ has full ESM support |
| .npmignore files | `files` field whitelist | Long-standing | files is safer, more explicit |
| prepublish script | prepublishOnly script | npm v4 (2016) | prepublish ran on install too, confusing |

**Deprecated/outdated:**
- npm classic tokens: Permanently deprecated December 2025
- prepublish for publish-only tasks: Use prepublishOnly instead

## Platform-Specific Notes

### macOS
- tmux via Homebrew: `brew install tmux`
- npm global packages work without sudo if using nvm or Homebrew node

### Linux (Debian/Ubuntu)
- tmux via apt: `sudo apt install tmux`
- May need npm prefix configuration for global packages without sudo

### WSL2
- tmux via apt in WSL distro: `sudo apt install tmux`
- Known issues: screen lag in some terminals, rendering issues with status bar
- Recommended: Restart WSL (`wsl.exe --shutdown`) if tmux behaves oddly

### sudo-free npm Global Install
Users who installed Node.js via system package manager may need:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Add to ~/.bashrc or ~/.zshrc:
export PATH=~/.npm-global/bin:$PATH
```

Or recommend using nvm which avoids these issues entirely.

## Open Questions

1. **Screenshot capture**
   - What we know: Decision is to include static screenshot, not GIF
   - What's unclear: Best tool to capture terminal TUI cleanly
   - Recommendation: Use any screenshot tool; place in docs/ or assets/ directory (not in `files` array)

2. **npm token management for initial publish**
   - What we know: Classic tokens deprecated Dec 2025; need granular token or OIDC
   - What's unclear: User's npm account setup
   - Recommendation: Document `npm login` + `npm publish` flow; mention 90-day token expiry

## Sources

### Primary (HIGH confidence)
- npm docs - package.json configuration (files, bin, engines fields)
- npm docs - scripts (prepublishOnly, prepare lifecycle)
- npm docs - Resolving EACCES permissions errors
- tsup documentation - shebang handling, ESM output

### Secondary (MEDIUM confidence)
- [sindresorhus/guides - npm-global-without-sudo](https://github.com/sindresorhus/guides/blob/main/npm-global-without-sudo.md) - sudo-free npm config
- [tmux installation guide](https://tmux.info/docs/installation) - platform-specific tmux install
- Various npm community best practices on `npm pack` testing

### Tertiary (LOW confidence)
- WebSearch results on WSL2 tmux issues (specific version/config dependent)

## Metadata

**Confidence breakdown:**
- Package.json configuration: HIGH - verified via npm official docs
- README structure: HIGH - established patterns for CLI tools
- Platform troubleshooting: MEDIUM - based on community reports, may vary by system

**Research date:** 2026-02-02
**Valid until:** 90 days (stable domain, npm practices well-established)

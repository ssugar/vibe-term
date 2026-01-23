# Phase 3: Status Detection - Research

**Researched:** 2026-01-22
**Domain:** JSONL log parsing, state detection, model identification
**Confidence:** HIGH

## Summary

This research establishes how to detect Working/Idle/Blocked states and model type from Claude Code's JSONL session logs. Claude Code stores conversation transcripts in `~/.claude/projects/` as JSONL files, with each line representing a single event (user message, assistant response, tool use, etc.).

The key finding is that **state can be determined by examining the last log entry's `type`, `stop_reason`, and `message.content[0].type` fields**. Combined with time-based heuristics, this enables accurate state detection:
- **Working**: Last entry is user input, or assistant message without `stop_reason: "end_turn"`
- **Idle**: Last entry is assistant message with `stop_reason: "end_turn"`
- **Blocked**: Last entry has `stop_reason: "tool_use"` (Claude waiting for tool approval)

**Primary recommendation:** Read the last line of each session's JSONL file, parse it, and apply a state machine based on the entry type, stop_reason, and elapsed time since the last entry. Use time-based heuristics (5+ seconds with tool_use stop_reason) to distinguish "waiting for approval" from "actively running tool".

## Standard Stack

The approach uses Node.js built-ins with one small utility package:

### Core (Minimal dependencies)
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| `fs.readFileSync` or async variant | Read JSONL file | Built-in, handles small files well |
| `path.join` | Build log paths | Built-in path handling |
| Manual last-line extraction | Get most recent entry | Simple string split, no package needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `read-last-lines` | ^1.2.0 | Efficient last N lines | For large log files (optional optimization) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `read-last-lines` | Manual `fs.readFileSync` + split | For small files (<1MB), manual is simpler and zero dependencies |
| File watching | Polling | Polling already implemented in Phase 2; watching adds complexity |
| Streaming parser | Full file read | Streaming only needed if files are very large |

**Installation:**
```bash
npm install read-last-lines  # Optional - only if performance testing shows need
```

**Note:** Per project philosophy of minimal dependencies, start with built-in `fs` and only add `read-last-lines` if log files prove large enough to warrant it.

## Architecture Patterns

### Recommended Project Structure Addition
```
src/
├── services/
│   ├── logParser.ts          # JSONL log parsing service
│   └── statusDetector.ts     # State detection from parsed logs
├── utils/
│   └── paths.ts              # Claude log path utilities
└── stores/
    └── types.ts              # Extended Session type with status
```

### Pattern 1: Log Path Resolution
**What:** Resolve the JSONL log file path for a Claude session
**When to use:** Finding the log file for a given project/session
**Example:**
```typescript
// Source: Claude Code stores logs in ~/.claude/projects/[encoded-path]/[session-id].jsonl
import { homedir } from 'os';
import { join, resolve } from 'path';
import { readdirSync, statSync } from 'fs';

/**
 * Encode a project path to match Claude's directory naming.
 * Claude uses a URL-safe base64-like encoding for project paths.
 */
export function encodeProjectPath(projectPath: string): string {
  // Claude encodes the absolute path - replace / with - and other special chars
  const normalized = resolve(projectPath);
  // Use base64url encoding (matches Claude's approach)
  return Buffer.from(normalized).toString('base64url');
}

/**
 * Find the most recent JSONL log file for a project.
 */
export function findLatestLogFile(projectPath: string): string | null {
  const claudeProjectsDir = join(homedir(), '.claude', 'projects');
  const encodedPath = encodeProjectPath(projectPath);
  const projectLogDir = join(claudeProjectsDir, encodedPath);

  try {
    const files = readdirSync(projectLogDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        path: join(projectLogDir, f),
        mtime: statSync(join(projectLogDir, f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime); // Most recent first

    return files.length > 0 ? files[0].path : null;
  } catch {
    return null; // Directory doesn't exist or can't be read
  }
}
```

### Pattern 2: Last Line Reader
**What:** Read the last non-empty line of a JSONL file
**When to use:** Getting the most recent log entry
**Example:**
```typescript
// Source: Simple implementation for small-medium files
import { readFileSync } from 'fs';

/**
 * Read the last non-empty line from a file.
 * For JSONL files under ~10MB, this simple approach is fast enough.
 */
export function readLastLine(filePath: string): string | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    // Find last non-empty line (from end)
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line) return line;
    }

    return null;
  } catch {
    return null; // File doesn't exist or can't be read
  }
}
```

### Pattern 3: JSONL Entry Parser
**What:** Parse a JSONL entry and extract state-relevant fields
**When to use:** Processing the last log entry
**Example:**
```typescript
// Source: Based on Claude Code JSONL schema from multiple log viewers
interface LogEntry {
  type: 'user' | 'assistant' | 'summary';
  timestamp: string;
  uuid: string;
  sessionId: string;
  message?: {
    role: 'user' | 'assistant';
    model?: string;  // e.g., "claude-opus-4-20250514", "claude-sonnet-4-5-20250929"
    content?: Array<{
      type: 'text' | 'tool_use' | 'tool_result';
      text?: string;
      name?: string;       // Tool name for tool_use
      input?: unknown;     // Tool input for tool_use
      tool_use_id?: string; // For tool_result
    }>;
    stop_reason?: 'end_turn' | 'tool_use' | 'max_tokens' | null;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  toolUseResult?: unknown;
  cwd?: string;
  isSidechain?: boolean;
}

export function parseLogEntry(line: string): LogEntry | null {
  try {
    return JSON.parse(line) as LogEntry;
  } catch {
    return null;
  }
}
```

### Pattern 4: State Detection Logic
**What:** Determine session state from parsed log entry
**When to use:** Converting log data to Working/Idle/Blocked status
**Example:**
```typescript
// Source: Based on claude-watch-status project and claude-code-ui patterns
import type { Session } from '../stores/types.js';

type SessionStatus = 'working' | 'idle' | 'blocked';

interface StateResult {
  status: SessionStatus;
  model: 'sonnet' | 'opus' | 'haiku' | null;
}

/**
 * Determine session state from the last log entry.
 *
 * State Machine:
 * - User entry (text) → User just typed, Claude about to respond → Working
 * - User entry (tool_result) → User approved tool, Claude processing → Working
 * - Assistant entry, stop_reason=null → Claude still generating → Working
 * - Assistant entry, stop_reason="end_turn" → Claude done, waiting → Idle
 * - Assistant entry, stop_reason="tool_use" → Claude needs tool approval → Blocked
 * - Time heuristic: tool_use + >5s elapsed → Definitely blocked
 */
export function detectState(entry: LogEntry, entryTimestamp: Date): StateResult {
  const now = new Date();
  const elapsed = now.getTime() - entryTimestamp.getTime();
  const TOOL_APPROVAL_THRESHOLD = 5000; // 5 seconds

  // Extract model from assistant messages
  const model = extractModelName(entry.message?.model);

  // User entries mean Claude is about to respond or is processing tool result
  if (entry.type === 'user') {
    return { status: 'working', model };
  }

  // Summary entries are metadata, treat as idle
  if (entry.type === 'summary') {
    return { status: 'idle', model };
  }

  // Assistant entries - check stop_reason
  const stopReason = entry.message?.stop_reason;

  // Claude wants to use a tool and is waiting for approval
  if (stopReason === 'tool_use') {
    // If more than threshold elapsed, definitely blocked
    if (elapsed > TOOL_APPROVAL_THRESHOLD) {
      return { status: 'blocked', model };
    }
    // Recently requested tool - might still be running
    return { status: 'working', model };
  }

  // Claude finished its turn naturally
  if (stopReason === 'end_turn') {
    return { status: 'idle', model };
  }

  // No stop_reason yet means still generating
  if (stopReason === null || stopReason === undefined) {
    // Check content type to refine
    const contentType = entry.message?.content?.[0]?.type;
    if (contentType === 'tool_use') {
      // Has tool_use content but no stop_reason - tool is executing
      return { status: 'working', model };
    }
    // Still generating text
    return { status: 'working', model };
  }

  // Default to idle for unexpected cases
  return { status: 'idle', model };
}

/**
 * Extract canonical model name (sonnet/opus/haiku) from full model string.
 */
function extractModelName(modelString?: string): 'sonnet' | 'opus' | 'haiku' | null {
  if (!modelString) return null;

  const lower = modelString.toLowerCase();
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('sonnet')) return 'sonnet';
  if (lower.includes('haiku')) return 'haiku';

  return null;
}
```

### Pattern 5: Status Service Integration
**What:** Integrate status detection into session building
**When to use:** Extending Phase 2's session detection
**Example:**
```typescript
// Source: Integration pattern for existing sessionBuilder.ts
import { findLatestLogFile, readLastLine, parseLogEntry, detectState } from './logParser.js';
import type { Session } from '../stores/types.js';

/**
 * Enrich a session with status and model from log parsing.
 */
export function enrichSessionStatus(session: Session): Session {
  const logFile = findLatestLogFile(session.projectPath);

  if (!logFile) {
    // No log file - can't determine status
    return { ...session, status: 'idle', model: 'sonnet' }; // Defaults
  }

  const lastLine = readLastLine(logFile);
  if (!lastLine) {
    return { ...session, status: 'idle', model: 'sonnet' };
  }

  const entry = parseLogEntry(lastLine);
  if (!entry) {
    return { ...session, status: 'idle', model: 'sonnet' };
  }

  const entryTimestamp = new Date(entry.timestamp);
  const { status, model } = detectState(entry, entryTimestamp);

  return {
    ...session,
    status,
    model: model || 'sonnet', // Default to sonnet if unknown
  };
}
```

### Pattern 6: Blocked Session Sorting
**What:** Sort sessions with blocked at top, then by previous order
**When to use:** Session list rendering per CONTEXT.md decision
**Example:**
```typescript
// Source: Per 03-CONTEXT.md - blocked sessions always sort to top
export function sortSessionsWithBlocked(
  sessions: Session[],
  previousOrder: string[]
): Session[] {
  // Separate blocked from non-blocked
  const blocked: Session[] = [];
  const nonBlocked: Session[] = [];

  for (const session of sessions) {
    if (session.status === 'blocked') {
      blocked.push(session);
    } else {
      nonBlocked.push(session);
    }
  }

  // Sort blocked by how long they've been blocked (oldest first for urgency)
  blocked.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  // Sort non-blocked by stable ordering (existing maintain position)
  const previousOrderSet = new Set(previousOrder);
  const existingNonBlocked: Session[] = [];
  const newNonBlocked: Session[] = [];

  for (const session of nonBlocked) {
    if (previousOrderSet.has(session.id)) {
      existingNonBlocked.push(session);
    } else {
      newNonBlocked.push(session);
    }
  }

  existingNonBlocked.sort((a, b) =>
    previousOrder.indexOf(a.id) - previousOrder.indexOf(b.id)
  );
  newNonBlocked.sort((a, b) =>
    a.startedAt.getTime() - b.startedAt.getTime()
  );

  // Blocked at top, then existing order, then new
  return [...blocked, ...existingNonBlocked, ...newNonBlocked];
}
```

### Anti-Patterns to Avoid
- **Parsing entire log file**: Only read the last line; full parsing is wasteful
- **Caching log entries**: Fresh read every poll; cache invalidation is complex
- **Assuming log file exists**: Gracefully handle missing/unreadable files
- **Hardcoding model names**: Use string matching for model detection; new models may appear
- **Blocking I/O in render loop**: Read files asynchronously; don't block Ink's render

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log path encoding | Custom base64 | `Buffer.from().toString('base64url')` | Exact match to Claude's encoding |
| Last line reading | String manipulation on large files | `read-last-lines` (if needed) | Efficient for large files |
| Model name extraction | Regex for each model | Simple `includes()` checks | More maintainable, handles new model names |
| Time elapsed calculation | Custom date math | `Date.getTime()` subtraction | Standard approach, handles timezones |
| JSONL parsing | Custom parser | `JSON.parse()` per line | JSONL is newline-delimited JSON |

**Key insight:** JSONL files are simple - each line is valid JSON. The challenge is efficient last-line access and correct state machine logic, not parsing complexity.

## Common Pitfalls

### Pitfall 1: Stale Log Files
**What goes wrong:** Session shows old status because log file hasn't been updated
**Why it happens:** Claude may have crashed or session ended without final log entry
**How to avoid:** Combine log state with process detection from Phase 2; if process is gone, mark as "ended"
**Warning signs:** Session shows "working" but process doesn't exist

### Pitfall 2: Race Condition on Log Read
**What goes wrong:** Read partial JSON line while Claude is writing
**Why it happens:** No file locking between Claude writing and HUD reading
**How to avoid:** Wrap JSON.parse in try/catch; if parse fails, retry on next poll
**Warning signs:** Intermittent JSON parse errors

### Pitfall 3: Incorrect Path Encoding
**What goes wrong:** Can't find log directory for a project
**Why it happens:** Path encoding doesn't match Claude's encoding scheme
**How to avoid:** Use `Buffer.from(path).toString('base64url')` which matches Claude's approach
**Warning signs:** Log directory not found for valid projects

### Pitfall 4: Model Detection Fails on New Models
**What goes wrong:** Model shows as "unknown" for new Claude model
**Why it happens:** Hard-coded model name checks don't include new models
**How to avoid:** Use `includes()` pattern matching; default to most common model
**Warning signs:** New model releases cause "unknown" display

### Pitfall 5: Blocked Detection False Positives
**What goes wrong:** Session shows "blocked" when tool is actually running
**Why it happens:** Tool execution can take time; immediate tool_use stop_reason doesn't mean blocked
**How to avoid:** Use time threshold (5+ seconds) before declaring blocked
**Warning signs:** Briefly flashing "blocked" then "working"

### Pitfall 6: Log File Retention
**What goes wrong:** Can't find logs for sessions older than 30 days
**Why it happens:** Claude Code auto-deletes logs after 30 days by default
**How to avoid:** Document limitation; only show status for current/recent sessions
**Warning signs:** Older sessions show unknown status

## Code Examples

Verified patterns from research and existing implementations:

### Complete Status Detection Service
```typescript
// Source: Synthesized from claude-watch-status, claude-code-ui, and official docs
import { readFileSync, readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import type { Session } from '../stores/types.js';

// JSONL entry structure (subset of fields we need)
interface LogEntry {
  type: 'user' | 'assistant' | 'summary';
  timestamp: string;
  message?: {
    model?: string;
    stop_reason?: 'end_turn' | 'tool_use' | 'max_tokens' | null;
    content?: Array<{ type: 'text' | 'tool_use' | 'tool_result' }>;
  };
}

type SessionStatus = Session['status'];
type ModelType = Session['model'];

const TOOL_APPROVAL_THRESHOLD_MS = 5000;

/**
 * Encode project path to match Claude's directory naming scheme.
 */
export function encodeProjectPath(projectPath: string): string {
  return Buffer.from(resolve(projectPath)).toString('base64url');
}

/**
 * Find the most recently modified JSONL log for a project.
 */
export function findLatestLogFile(projectPath: string): string | null {
  const claudeDir = join(homedir(), '.claude', 'projects');
  const encoded = encodeProjectPath(projectPath);
  const projectDir = join(claudeDir, encoded);

  try {
    const jsonlFiles = readdirSync(projectDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => {
        const fullPath = join(projectDir, f);
        return { path: fullPath, mtime: statSync(fullPath).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    return jsonlFiles.length > 0 ? jsonlFiles[0].path : null;
  } catch {
    return null;
  }
}

/**
 * Read and parse the last line of a JSONL file.
 */
export function readLastEntry(filePath: string): LogEntry | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    if (lines.length === 0) return null;

    // Try last few lines in case last one is malformed
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
      try {
        return JSON.parse(lines[i]) as LogEntry;
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract model type from full model string.
 */
export function extractModel(modelString?: string): ModelType {
  if (!modelString) return 'sonnet'; // Default

  const lower = modelString.toLowerCase();
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('haiku')) return 'haiku';
  return 'sonnet'; // Default to sonnet
}

/**
 * Detect session status from log entry.
 */
export function detectStatus(
  entry: LogEntry,
  entryTime: Date
): SessionStatus {
  const elapsedMs = Date.now() - entryTime.getTime();

  // User messages mean Claude is processing
  if (entry.type === 'user') {
    return 'working';
  }

  // Summary entries are metadata
  if (entry.type === 'summary') {
    return 'idle';
  }

  // Assistant entries - check stop_reason
  const stopReason = entry.message?.stop_reason;

  if (stopReason === 'tool_use') {
    // Tool requested - blocked if waiting long enough
    return elapsedMs > TOOL_APPROVAL_THRESHOLD_MS ? 'blocked' : 'working';
  }

  if (stopReason === 'end_turn') {
    return 'idle';
  }

  // No stop_reason means still generating
  return 'working';
}

/**
 * Get status and model for a session.
 */
export function getSessionStatus(projectPath: string): {
  status: SessionStatus;
  model: ModelType;
} {
  const logFile = findLatestLogFile(projectPath);
  if (!logFile) {
    return { status: 'idle', model: 'sonnet' };
  }

  const entry = readLastEntry(logFile);
  if (!entry) {
    return { status: 'idle', model: 'sonnet' };
  }

  const entryTime = new Date(entry.timestamp);
  const status = detectStatus(entry, entryTime);
  const model = extractModel(entry.message?.model);

  return { status, model };
}
```

### SessionRow with Status Indicator
```typescript
// Source: Ink Text component docs + CONTEXT.md requirements
import React from 'react';
import { Box, Text } from 'ink';
import type { Session } from '../stores/types.js';

// Status emojis per CONTEXT.md decisions
const STATUS_EMOJI: Record<Session['status'], string> = {
  idle: '\u2705',     // Green checkmark
  working: '\u23F3',  // Hourglass
  blocked: '\u{1F6D1}', // Stop sign
  ended: '\u274C',    // X mark
};

interface SessionRowProps {
  session: Session;
  index: number;
}

export function SessionRow({ session, index }: SessionRowProps): React.ReactElement {
  const isBlocked = session.status === 'blocked';

  // Blocked rows get special treatment
  const bgColor = isBlocked ? 'red' : undefined;
  const textColor = isBlocked ? 'white' : undefined;

  // Model display - dimmed if unknown detection
  const modelDisplay = session.model || 'unknown';

  return (
    <Box flexDirection="row">
      {/* Blocked rows have background color */}
      <Text bold={isBlocked} backgroundColor={bgColor} color={textColor}>
        {/* Index */}
        <Text color={isBlocked ? 'white' : 'cyan'} bold>[{index}]</Text>
        <Text> </Text>

        {/* Status emoji */}
        <Text>{STATUS_EMOJI[session.status]}</Text>
        <Text> </Text>

        {/* Project name */}
        <Text>{session.projectName.padEnd(24)}</Text>
        <Text> </Text>

        {/* Duration */}
        <Text dimColor={!isBlocked}>{formatDuration(session.startedAt).padStart(12)}</Text>
        <Text> </Text>

        {/* Model */}
        <Text dimColor={!isBlocked}>{modelDisplay}</Text>
      </Text>
    </Box>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Process inspection only | Log file + process detection | 2025+ | Accurate state vs just "running" |
| OpenTelemetry for monitoring | JSONL log parsing | N/A | OTEL is opt-in enterprise; JSONL is local and universal |
| External watcher daemon | Integrated polling | N/A | Simpler architecture, no separate process |

**Deprecated/outdated:**
- Early Claude Code versions may have had different log formats
- `~/.config/claude/` was an older log location in some early versions

## Open Questions

Things that couldn't be fully resolved:

1. **Exact path encoding algorithm**
   - What we know: Claude uses something like base64url
   - What's unclear: Exact encoding for special characters in paths
   - Recommendation: Test with actual Claude sessions, verify encoding works

2. **Log file selection with multiple sessions**
   - What we know: Multiple JSONL files can exist per project
   - What's unclear: How to correlate specific process with specific log file
   - Recommendation: Use most recently modified file; revisit if users report issues

3. **Handling of stop_reason during tool execution**
   - What we know: tool_use stop_reason means Claude wants to use a tool
   - What's unclear: Exact timing of when stop_reason appears vs when tool actually runs
   - Recommendation: Use time threshold; tune based on real-world testing

4. **Model field location consistency**
   - What we know: Model appears in assistant message entries
   - What's unclear: Is model always present? Only on first message?
   - Recommendation: Search backwards through last few entries if model not in last entry

## Sources

### Primary (HIGH confidence)
- [Claude Code Monitoring Docs](https://code.claude.com/docs/en/monitoring-usage) - OTel events structure, stop_reason values
- [Handling Stop Reasons - Claude Docs](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons) - Complete stop_reason enumeration
- [claude-watch-status GitHub](https://github.com/sho7650/claude-watch-status) - Working state detection implementation
- [claude-code-ui GitHub](https://github.com/KyleAMathews/claude-code-ui) - XState-based state machine approach
- [Liam ERD DuckDB Article](https://liambx.com/blog/claude-code-log-analysis-with-duckdb) - JSONL schema details
- [Ink GitHub](https://github.com/vadimdemedes/ink) - Text component styling props

### Secondary (MEDIUM confidence)
- [claude-code-log GitHub](https://github.com/daaain/claude-code-log) - JSONL parsing approach
- [clog GitHub](https://github.com/HillviewCap/clog) - Log entry structure
- [claude-JSONL-browser](https://github.com/withLinda/claude-JSONL-browser) - Message type handling
- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference) - Session persistence options

### Tertiary (LOW confidence)
- WebSearch results on Node.js file reading patterns
- Medium article on Claude Code internals (403'd, could not verify)

## Metadata

**Confidence breakdown:**
- Log file location: HIGH - Multiple sources confirm `~/.claude/projects/`
- JSONL structure: HIGH - Verified across multiple log viewers and official docs
- State detection logic: HIGH - Based on official stop_reason documentation
- Path encoding: MEDIUM - Inferred from directory names, not officially documented
- Model field location: MEDIUM - Observed in examples, may vary

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable log format)

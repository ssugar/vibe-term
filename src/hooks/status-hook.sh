#!/bin/bash
# Claude Code hook for HUD status tracking
# Writes status updates to ~/.claude-hud/sessions/

# Don't use set -e, we want graceful degradation
# set -e

# Read hook input from stdin
INPUT=$(cat)

# Parse fields using jq (commonly available)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event_name // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // empty')

# Ensure we have required fields
if [ -z "$SESSION_ID" ] || [ -z "$HOOK_EVENT" ]; then
  exit 0  # Silent exit, don't break Claude
fi

# State directory and file
STATE_DIR="$HOME/.claude-hud/sessions"
STATE_FILE="$STATE_DIR/${SESSION_ID}.json"
mkdir -p "$STATE_DIR"

# Handle SessionEnd - clean up state file
if [ "$HOOK_EVENT" = "SessionEnd" ]; then
  rm -f "$STATE_FILE"
  exit 0
fi

# Read existing state if it exists (for subagent count preservation)
SUBAGENT_COUNT=0
EXISTING_MODEL=""
if [ -f "$STATE_FILE" ]; then
  SUBAGENT_COUNT=$(jq -r '.subagentCount // 0' "$STATE_FILE" 2>/dev/null || echo "0")
  EXISTING_MODEL=$(jq -r '.model // empty' "$STATE_FILE" 2>/dev/null || echo "")
fi

# Determine status and subagent count changes based on hook event
STATUS=""
case "$HOOK_EVENT" in
  UserPromptSubmit)
    STATUS="working"
    ;;
  PermissionRequest)
    STATUS="blocked"
    ;;
  PostToolUse)
    STATUS="working"
    ;;
  PostToolUseFailure)
    STATUS="working"
    ;;
  Stop)
    STATUS="idle"
    ;;
  SubagentStart)
    STATUS="working"
    SUBAGENT_COUNT=$((SUBAGENT_COUNT + 1))
    ;;
  SubagentStop)
    SUBAGENT_COUNT=$((SUBAGENT_COUNT - 1))
    if [ "$SUBAGENT_COUNT" -lt 0 ]; then
      SUBAGENT_COUNT=0
    fi
    # Keep existing status or default to working if subagents still running
    if [ "$SUBAGENT_COUNT" -gt 0 ]; then
      STATUS="working"
    fi
    ;;
  *)
    # Unknown event, don't update
    exit 0
    ;;
esac

# If no status change determined (e.g., SubagentStop with no remaining subagents),
# read existing status
if [ -z "$STATUS" ] && [ -f "$STATE_FILE" ]; then
  STATUS=$(jq -r '.status // "idle"' "$STATE_FILE" 2>/dev/null || echo "idle")
fi
# Default to idle if still no status
if [ -z "$STATUS" ]; then
  STATUS="idle"
fi

# Extract model from transcript if available (best effort)
MODEL=""
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # Get model from last assistant message that has one
  MODEL=$(tail -100 "$TRANSCRIPT_PATH" 2>/dev/null | grep -o '"model":"[^"]*"' | tail -1 | sed 's/"model":"//;s/"$//' || true)
  # Simplify model name
  if echo "$MODEL" | grep -qi "opus"; then
    MODEL="opus"
  elif echo "$MODEL" | grep -qi "haiku"; then
    MODEL="haiku"
  elif echo "$MODEL" | grep -qi "sonnet"; then
    MODEL="sonnet"
  else
    MODEL=""
  fi
fi

# Use existing model if we couldn't extract one
if [ -z "$MODEL" ] && [ -n "$EXISTING_MODEL" ]; then
  MODEL="$EXISTING_MODEL"
fi

# Write state file (atomic write via temp file)
TEMP_FILE="$STATE_FILE.tmp.$$"

cat > "$TEMP_FILE" << EOF
{
  "status": "$STATUS",
  "model": "$MODEL",
  "cwd": "$CWD",
  "sessionId": "$SESSION_ID",
  "subagentCount": $SUBAGENT_COUNT,
  "lastUpdate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

mv "$TEMP_FILE" "$STATE_FILE"

# Exit cleanly (don't affect Claude's behavior)
exit 0

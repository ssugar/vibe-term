#!/bin/bash
# Claude Code hook for HUD status tracking
# Writes status updates to ~/.claude-hud/sessions/

set -e

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

# Determine status based on hook event
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
  Stop)
    STATUS="idle"
    ;;
  *)
    # Unknown event, don't update
    exit 0
    ;;
esac

# Create state directory
STATE_DIR="$HOME/.claude-hud/sessions"
mkdir -p "$STATE_DIR"

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

# Write state file (atomic write via temp file)
STATE_FILE="$STATE_DIR/${SESSION_ID}.json"
TEMP_FILE="$STATE_FILE.tmp.$$"

cat > "$TEMP_FILE" << EOF
{
  "status": "$STATUS",
  "model": "$MODEL",
  "cwd": "$CWD",
  "sessionId": "$SESSION_ID",
  "lastUpdate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

mv "$TEMP_FILE" "$STATE_FILE"

# Exit cleanly (don't affect Claude's behavior)
exit 0

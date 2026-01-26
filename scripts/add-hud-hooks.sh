#!/bin/bash
# Add HUD status-hook.sh to SessionStart hooks in all Claude project settings files
# This ensures the HUD gets notified when sessions start, regardless of project-level hook overrides

set -e

# Get script directory to compute relative path to hook
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HUD_HOOK="$SCRIPT_DIR/../src/hooks/status-hook.sh"
SEARCH_DIR="${1:-$HOME/claude}"

echo "Searching for Claude project settings in: $SEARCH_DIR"
echo "HUD hook path: $HUD_HOOK"
echo ""

# Find all project-level settings files
SETTINGS_FILES=$(find "$SEARCH_DIR" -name "settings.json" -path "*/.claude/*" 2>/dev/null | sort)

if [ -z "$SETTINGS_FILES" ]; then
  echo "No project settings files found."
  exit 0
fi

UPDATED=0
SKIPPED=0
ALREADY_HAS=0

for SETTINGS_FILE in $SETTINGS_FILES; do
  PROJECT_DIR=$(dirname "$(dirname "$SETTINGS_FILE")")
  PROJECT_NAME=$(basename "$PROJECT_DIR")

  # Check if file has valid JSON
  if ! jq empty "$SETTINGS_FILE" 2>/dev/null; then
    echo "[$PROJECT_NAME] SKIP - Invalid JSON"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  # Check if SessionStart hooks exist and already contain our hook
  HAS_SESSION_START=$(jq 'if has("hooks") and (.hooks | type == "object") then (.hooks | has("SessionStart")) else false end' "$SETTINGS_FILE")

  if [ "$HAS_SESSION_START" = "true" ]; then
    # Check if our hook is already there
    ALREADY_EXISTS=$(jq --arg hook "$HUD_HOOK" '
      .hooks.SessionStart[]?.hooks[]? |
      select(.command == $hook or (.command | contains("status-hook.sh")))
    ' "$SETTINGS_FILE" | head -1)

    if [ -n "$ALREADY_EXISTS" ]; then
      echo "[$PROJECT_NAME] OK - Already has HUD hook"
      ALREADY_HAS=$((ALREADY_HAS + 1))
      continue
    fi

    # Add our hook to existing SessionStart array
    jq --arg hook "$HUD_HOOK" '
      .hooks.SessionStart += [{"hooks": [{"type": "command", "command": $hook}]}]
    ' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"

    echo "[$PROJECT_NAME] UPDATED - Added HUD hook to SessionStart"
    UPDATED=$((UPDATED + 1))
  else
    # No SessionStart hooks - check if hooks object exists
    HAS_HOOKS=$(jq 'has("hooks") and (.hooks | type == "object")' "$SETTINGS_FILE")

    if [ "$HAS_HOOKS" = "true" ]; then
      # Add SessionStart to existing hooks object
      jq --arg hook "$HUD_HOOK" '
        .hooks.SessionStart = [{"hooks": [{"type": "command", "command": $hook}]}]
      ' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
    else
      # Add hooks object with SessionStart
      jq --arg hook "$HUD_HOOK" '
        . + {"hooks": {"SessionStart": [{"hooks": [{"type": "command", "command": $hook}]}]}}
      ' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp" && mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
    fi

    echo "[$PROJECT_NAME] UPDATED - Created SessionStart with HUD hook"
    UPDATED=$((UPDATED + 1))
  fi
done

echo ""
echo "Summary:"
echo "  Updated: $UPDATED"
echo "  Already configured: $ALREADY_HAS"
echo "  Skipped (invalid): $SKIPPED"
echo ""
echo "Done! New Claude sessions in these projects will now be tracked by the HUD."

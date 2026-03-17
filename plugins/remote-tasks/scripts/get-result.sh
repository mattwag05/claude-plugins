#!/bin/bash
# Retrieve full task result from a worker machine
# Usage: get-result.sh <task-id> [machine]

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
source "$SCRIPT_DIR/lib/config.sh"

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <task-id> [machine]" >&2
    echo "  machine defaults to 'pi' if not specified" >&2
    exit 1
fi

TASK_ID="$1"
MACHINE="${2:-pi}"

# Validate machine
if ! validate_machine "$MACHINE"; then
    echo "Error: Unknown machine '$MACHINE'. Valid: $(get_machine_aliases | tr '\n' ' ')" >&2
    exit 1
fi

# Get SSH host
SSH_HOST=$(get_ssh_host "$MACHINE")

# Result file path on remote machine
RESULT_FILE="\$HOME/.local/share/claude-worker/results/${TASK_ID}.txt"

# Fetch and display result
echo "=== Result for task $TASK_ID from $MACHINE ==="
echo ""

if ssh "$SSH_HOST" "cat $RESULT_FILE" 2>/dev/null; then
    exit 0
else
    echo "Error: Result file not found for task $TASK_ID on $MACHINE" >&2
    echo "Path checked: $RESULT_FILE" >&2
    exit 1
fi

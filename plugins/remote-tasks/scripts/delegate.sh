#!/bin/bash
# Delegate a task to a remote machine via Beads

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
source "$SCRIPT_DIR/lib/config.sh"

if [[ $# -lt 2 ]]; then
    echo "Usage: delegate.sh <machine> <task description>"
    echo "Machines: $(get_machine_aliases | tr '\n' ' ')"
    exit 1
fi

machine="$1"
shift
task="$*"

# Validate machine
if ! validate_machine "$machine"; then
    echo "Error: Unknown machine '$machine'. Valid: $(get_machine_aliases | tr '\n' ' ')"
    exit 1
fi

# Create Beads task with the task in the description field (for Claude execution)
echo "Creating task for $machine: $task"
if ! bd create --title="Remote task from $(hostname -s)" --description="$task" --assignee="$machine" --type=task --priority=2; then
    echo "ERROR: Failed to create Beads task" >&2
    exit 1
fi

# Sync to remote (timeout to prevent hangs, warn but don't fail)
if ! timeout 30 bd sync 2>/dev/null; then
    echo "WARNING: bd sync timed out or failed — task created locally but may not be visible to workers yet" >&2
fi

# Notify via ntfy (warn but don't fail if notification fails)
NTFY_URL=$(get_ntfy_url)
if ! curl -s --max-time 10 -d "New task delegated to $machine: $task" "$NTFY_URL" >/dev/null 2>&1; then
    echo "WARNING: ntfy notification failed — task still created successfully" >&2
fi

echo "Task created and delegated to $machine"

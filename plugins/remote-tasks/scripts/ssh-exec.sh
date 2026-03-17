#!/bin/bash
# Unified SSH execution wrapper for remote machines
# Usage: ssh-exec.sh <machine> <command>

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
source "$SCRIPT_DIR/lib/config.sh"

MACHINE="$1"
shift
COMMAND="$*"

if [ -z "$MACHINE" ] || [ -z "$COMMAND" ]; then
    echo "Usage: $0 <machine> <command>" >&2
    echo "Machines: $(get_machine_aliases | tr '\n' ' ')" >&2
    exit 1
fi

# Validate machine and get SSH host
if ! validate_machine "$MACHINE"; then
    echo "Unknown machine: $MACHINE" >&2
    echo "Valid machines: $(get_machine_aliases | tr '\n' ' ')" >&2
    exit 1
fi

HOST=$(get_ssh_host "$MACHINE")
ssh "$HOST" "$COMMAND"

#!/bin/bash
# Check status of all machines and pending tasks

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
source "$SCRIPT_DIR/lib/config.sh"

MACHINES=$(get_machine_aliases)

echo "=== Machine Status ==="
echo ""

for machine in $MACHINES; do
    name=$(jq -r ".machines.${machine}.name // \"$machine\"" "$CONFIG_FILE")
    hostname=$(get_machine_hostname "$machine")
    ssh_host=$(get_ssh_host "$machine")

    echo "$name ($hostname):"
    if ssh -o ConnectTimeout=3 "$ssh_host" "uptime" 2>/dev/null; then
        echo "  ✓ Online"
    else
        echo "  ✗ Offline"
    fi
    echo ""
done

# Build assignee list as a jq array for filtering
ASSIGNEES_JSON=$(echo "$MACHINES" | jq -Rsc 'split("\n") | map(select(. != ""))')

show_tasks() {
    local status="$1"
    local label="$2"
    echo "=== $label ==="
    bd list --status="$status" --json 2>/dev/null \
        | jq -r --argjson assignees "$ASSIGNEES_JSON" \
            '.[] | select(.assignee as $a | $assignees | index($a)) | "  [\(.assignee)] \(.title)"' \
        || echo "  No $status tasks"
    echo ""
}

show_tasks "open" "Open Remote Tasks"
show_tasks "in_progress" "In Progress Remote Tasks"

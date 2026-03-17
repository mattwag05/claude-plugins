#!/bin/bash
# Unified health check for all remote-tasks components
# Usage: health-check.sh [--alert]
# Exit code 0 = healthy, 1 = issues found

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
source "$SCRIPT_DIR/lib/config.sh"

ALERT=false
ISSUES=()

if [[ "$1" == "--alert" ]]; then
    ALERT=true
fi

check_pass() { echo "  ✅ $1"; }
check_fail() { echo "  ❌ $1"; ISSUES+=("$1"); }
check_warn() { echo "  ⚠️  $1"; }
section()    { echo ""; echo "=== $1 ==="; }

# Check each worker machine
for alias in $(get_machine_aliases); do
    has_worker=$(jq -r ".machines.${alias}.hasWorker // false" "$CONFIG_FILE")
    [[ "$has_worker" != "true" ]] && continue

    ip=$(get_machine_ip "$alias")
    name=$(jq -r ".machines.${alias}.name" "$CONFIG_FILE")
    section "$name ($alias @ $ip)"

    # SSH reachability
    if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$ip" "echo OK" >/dev/null 2>&1; then
        check_pass "SSH reachable"
    else
        check_fail "$alias: SSH unreachable"
        continue  # Skip remaining checks if can't connect
    fi

    # Service state
    state=$(ssh -o ConnectTimeout=5 "$ip" "systemctl --user is-active claude-worker 2>/dev/null" 2>/dev/null)
    if [[ "$state" == "active" ]]; then
        check_pass "Worker service active"
    else
        check_fail "$alias: Worker service $state"
    fi

    # Circuit breaker
    cb_content=$(ssh -o ConnectTimeout=5 "$ip" "cat ~/.local/share/claude-worker/circuit-breaker 2>/dev/null" 2>/dev/null)
    if [[ -n "$cb_content" ]]; then
        cb_count=$(echo "$cb_content" | cut -d: -f1)
        if [[ $cb_count -ge 5 ]]; then
            check_fail "$alias: Circuit breaker OPEN ($cb_count failures)"
        elif [[ $cb_count -gt 0 ]]; then
            check_warn "Circuit breaker: $cb_count failures"
        else
            check_pass "Circuit breaker closed"
        fi
    else
        check_pass "Circuit breaker closed"
    fi

    # Memory usage
    mem_percent=$(ssh -o ConnectTimeout=5 "$ip" "free | awk '/^Mem:/{printf \"%d\", (\$3/\$2)*100}'" 2>/dev/null)
    if [[ -n "$mem_percent" ]]; then
        if [[ $mem_percent -ge 90 ]]; then
            check_fail "$alias: Memory at ${mem_percent}%"
        elif [[ $mem_percent -ge 80 ]]; then
            check_warn "Memory at ${mem_percent}%"
        else
            check_pass "Memory at ${mem_percent}%"
        fi
    fi

    # Recent log activity (last entry within 5 minutes = healthy polling)
    last_log=$(ssh -o ConnectTimeout=5 "$ip" "tail -1 ~/.local/share/claude-worker.log 2>/dev/null" 2>/dev/null)
    if [[ -n "$last_log" ]]; then
        # Extract timestamp from log line format: [YYYY-MM-DD HH:MM:SS]
        log_ts=$(echo "$last_log" | grep -oE '\[([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2})\]' | tr -d '[]')
        if [[ -n "$log_ts" ]]; then
            log_epoch=$(date -d "$log_ts" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "$log_ts" +%s 2>/dev/null)
            now_epoch=$(date +%s)
            age=$((now_epoch - log_epoch))
            if [[ $age -gt 300 ]]; then
                check_warn "Last log entry ${age}s ago (>5min)"
            else
                check_pass "Recent log activity (${age}s ago)"
            fi
        else
            check_warn "Could not parse log timestamp"
        fi
    else
        check_warn "No log entries found"
    fi
done

# Check ntfy server
ntfy_server=$(jq -r '.ntfy.server' "$CONFIG_FILE")
section "ntfy Server ($ntfy_server)"

if curl -s --max-time 5 "$ntfy_server/v1/health" >/dev/null 2>&1; then
    check_pass "ntfy server healthy"
else
    # Try the topic endpoint as fallback
    ntfy_topic=$(jq -r '.ntfy.topic' "$CONFIG_FILE")
    if curl -s --max-time 5 "$ntfy_server/$ntfy_topic" >/dev/null 2>&1; then
        check_pass "ntfy server reachable (topic endpoint)"
    else
        check_fail "ntfy server unreachable"
    fi
fi

# Summary
section "Summary"
if [[ ${#ISSUES[@]} -eq 0 ]]; then
    echo "  All checks passed ✅"

    # Send ntfy alert for all-clear if requested
    if $ALERT; then
        echo "  (No alert sent — all healthy)"
    fi
    exit 0
else
    echo "  ${#ISSUES[@]} issue(s) found:"
    for issue in "${ISSUES[@]}"; do
        echo "    - $issue"
    done

    # Send ntfy alert if requested
    if $ALERT; then
        NTFY_URL=$(get_ntfy_url)
        alert_msg="Health check: ${#ISSUES[@]} issue(s) — $(printf '%s; ' "${ISSUES[@]}")"
        if curl -s --max-time 10 -d "$alert_msg" "$NTFY_URL" >/dev/null 2>&1; then
            echo "  Alert sent to ntfy"
        else
            echo "  WARNING: Failed to send alert to ntfy"
        fi
    fi
    exit 1
fi

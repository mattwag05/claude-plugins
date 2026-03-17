---
name: remote-tasks
description: Use when delegating tasks to remote machines (Pi, Pironman) over Tailscale, checking worker status, or retrieving task results. Triggers on "delegate to pi", "run on pironman", "remote task", "check worker status", "get task result", or any async cross-machine delegation workflow.
---

# Remote Tasks

Async cross-machine task delegation via SSH and Beads. Delegates work to Raspberry Pi and Pironman workers over Tailscale VPN.

## Available Machines

| Alias | Hostname | Tailscale IP | Capabilities |
|-------|----------|-------------|-------------|
| `pi` | raspberrypi | 100.120.127.35 | task-worker |
| `pironman` | pironman | 100.75.2.44 | task-worker, ntfy-server |

See `config/machines.json` for the full registry.

## Core Workflow

### 1. Delegate a task
```bash
./scripts/delegate.sh <machine> <task description>
# Example:
./scripts/delegate.sh pi "Check all Docker containers on Pironman and report status"
./scripts/delegate.sh pironman "Run database backup and upload to Seafile"
```

Creates a Beads task, syncs to remote, and sends ntfy notification to wake the worker.

### 2. Check status
```bash
./scripts/status.sh
```

Shows all machine online/offline status and pending tasks grouped by machine.

### 3. Retrieve results
```bash
./scripts/get-result.sh <task-id> [machine]
# machine defaults to 'pi' if omitted
./scripts/get-result.sh abc-123
./scripts/get-result.sh abc-123 pironman
```

Fetches full task output from the worker's Beads database.

## Other Scripts

### ssh-exec.sh — unified SSH wrapper
```bash
./scripts/ssh-exec.sh <machine> <command>
./scripts/ssh-exec.sh pi "df -h"
./scripts/ssh-exec.sh pironman "docker ps --format 'table {{.Names}}\t{{.Status}}'"
```

### analyze-complexity.sh — auto-select model tier
```bash
./scripts/analyze-complexity.sh "<task description>"
# Outputs: "opus", "sonnet", or "haiku"
```

Heuristic: security/architecture/audit → opus; refactor/test/implement → sonnet; everything else → haiku (based on word count).

### health-check.sh — system health
```bash
./scripts/health-check.sh
```

Checks Tailscale connectivity, SSH auth, Beads CLI availability, and worker daemon status on each machine.

## Prerequisites

Before using remote-tasks, ensure:

1. **Tailscale VPN** — `tailscale status` shows both `raspberrypi` and `pironman` as connected
2. **SSH keys** — passwordless `ssh raspberrypi` and `ssh pironman` must work
3. **Beads CLI** (`bd`) — installed on this machine AND on both workers
4. **jq** — required by most scripts (`brew install jq`)
5. **Worker daemon** — must be running on each target machine (see `worker/` directory)
6. **ntfy server** — running on Pironman at `http://pironman:8080/remote-tasks`

## Delegation Patterns

**Delegation for long-running work:**
```bash
# Delegate, don't wait
./scripts/delegate.sh pi "Regenerate Pi-hole blocklists and restart gravity"

# Check back later
./scripts/status.sh

# Get output when done
./scripts/get-result.sh <task-id>
```

**Quick remote execution (when result needed immediately):**
```bash
./scripts/ssh-exec.sh pi "docker ps --filter status=running"
```

**Before delegating complex tasks:**
```bash
./scripts/analyze-complexity.sh "implement feature X"  # → sonnet or opus
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ssh: connect to host raspberrypi` | Tailscale down | `tailscale up` |
| `bd sync timed out` | Worker offline | Check machine with `status.sh` |
| Task created but not picked up | Worker daemon not running | SSH to machine, check worker process |
| `jq: command not found` | Missing dep | `brew install jq` |
| ntfy notification fails | Pironman unreachable | Delegate still succeeds — task created |

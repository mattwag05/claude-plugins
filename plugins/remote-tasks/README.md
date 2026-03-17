# remote-tasks

Async cross-machine task delegation via SSH and Beads CLI — delegate work to Raspberry Pi and Pironman workers over Tailscale VPN.

## What It Does

Provides client-side scripts for delegating tasks asynchronously to remote worker machines. The coordinator (Mac) creates a Beads task, syncs it to the remote, and the worker daemon picks it up and executes it — results retrievable later.

## Setup

### Prerequisites

1. **Tailscale** — both `raspberrypi` and `pironman` must be reachable
2. **SSH keys** — passwordless SSH to both machines
3. **Beads CLI** (`bd`) — installed locally and on worker machines
4. **jq** — `brew install jq`
5. **Worker daemon** — deployed and running on target machines (see `worker/` in source repo)

### Configure machines

Review `config/machines.json` and update IPs or hostnames if your network changes.

## Quick Start

```bash
# Delegate a task to the Pi
./scripts/delegate.sh pi "Check Pi-hole stats and report top blocked domains"

# Check all machine + task status
./scripts/status.sh

# Retrieve the result when done
./scripts/get-result.sh <task-id>
```

## Scripts

| Script | Usage |
|--------|-------|
| `delegate.sh <machine> <description>` | Create and sync an async task to a worker |
| `ssh-exec.sh <machine> <command>` | Execute a command on a remote machine immediately |
| `status.sh` | Show all machine + pending task status |
| `get-result.sh <task-id> [machine]` | Retrieve full task output |
| `analyze-complexity.sh "<description>"` | Auto-select model tier (opus/sonnet/haiku) |
| `health-check.sh` | End-to-end connectivity + worker health check |

## Machines

| Alias | Host | Tailscale IP |
|-------|------|-------------|
| `pi` | raspberrypi | 100.120.127.35 |
| `pironman` | pironman | 100.75.2.44 |

See `skills/remote-tasks/references/machine-topology.md` for full topology.

## Note

This plugin contains only the **client-side delegation scripts**. The worker daemon, SwiftUI monitor, and deployment scripts live in the `remote-tasks` Forgejo repo and run on the remote machines.

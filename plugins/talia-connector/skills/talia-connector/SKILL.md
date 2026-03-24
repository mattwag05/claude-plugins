---
name: talia-connector
description: Use when interacting with Talia (personal AI assistant on OpenClaw/Lume macOS VM). Triggers on talia_ask, talia_status, talia_memory_search, talia_sessions, talia_cron_list, talia_cron_run, talia_message_send, "ask Talia", "check Talia", "Talia's memory", "send Telegram", or any operation against the Talia MCP server.
---

# Talia Connector

> **ARCHIVED — Lume macOS VM decommissioned 2026-03-23.** This plugin is disabled. Talia/OpenClaw is being reinstalled on Pironman (Docker or native systemd). Until that is live, use `ssh raspberrypi "openclaw ..."` via the openclaw-cli skill for Pi-based OpenClaw commands, or interact with Talia directly via Telegram. Do not attempt to use talia_ask or other MCP tools — the SSH target `lumes-virtual-machine` no longer exists.

MCP bridge to Talia — personal AI assistant running on OpenClaw gateway in a Lume macOS VM. Provides 7 tools and 2 resources.

## Tools

### talia_ask
Send a message to Talia and receive her response.

```
talia_ask(message, deliver?, thinking?, timeout?)
```

- `message`: The prompt to send
- `deliver`: Also send Talia's reply via Telegram (default: false)
- `thinking`: Reasoning level — `off` | `minimal` | `low` | `medium` | `high` (default: off)
- `timeout`: Seconds to wait (default: 120, max: 600)

Complex tasks (SSH, file ops, research) may need timeout 300-600.

### talia_status
Check OpenClaw gateway health, channel status, and active sessions.

```
talia_status()
```

Use this first when debugging connection issues.

### talia_memory_search
Search Talia's indexed memory files with a query string.

```
talia_memory_search(query)
```

Returns matching snippets with relevance scores. Talia's memory contains personal context, project state, and learned preferences.

### talia_sessions
List active conversation sessions with token usage and model info.

```
talia_sessions()
```

### talia_cron_list
List all scheduled cron jobs (heartbeat, reports, etc.) with status and next run time.

```
talia_cron_list()
```

### talia_cron_run
Manually trigger a cron job by ID or name. Get IDs from `talia_cron_list` first.

```
talia_cron_run(id)
```

### talia_message_send
Send a message via Telegram through OpenClaw channels.

```
talia_message_send(message, target)
```

- `target`: Telegram chat ID (e.g., `"123456789"`) or `@username`

## Resources

| URI | Content |
|-----|---------|
| `talia://status` | OpenClaw gateway status + channel health (text) |
| `talia://memory` | Memory index status (JSON) |

## Prerequisites

The MCP server runs in **stdio mode** on the Mac — it SSHes to `lumes-virtual-machine` to run openclaw commands.

**Requirements:**
- `ssh lumes-virtual-machine` must work without password (key-based auth via Tailscale)
- `openclaw` must be in `~/.npm-global/bin/` in the VM
- OpenClaw gateway must be running in the VM (`openclaw status` to verify)
- Node.js must be available locally (`node talia-mcp.js` is the server command)

**MCP registration** (in `~/.claude.json`):
```json
"mcpServers": {
  "talia": {
    "type": "stdio",
    "command": "node",
    "args": ["/Users/matthewwagner/Projects/Talia-Connector/talia-mcp.js"]
  }
}
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Error: ssh: connect to host lumes-virtual-machine` | Tailscale down or VM offline | `tailscale status`, check VM with `lume get talia` |
| `Timed out after 30000ms` | openclaw slow or unresponsive | `ssh lumes-virtual-machine "openclaw status"` |
| `NO_COLOR` / ANSI in output | Strip failure | Restart MCP server, check NO_COLOR injection |
| Port 3847 in use | Stale SSE process | `lsof -ti:3847 | xargs kill -9` |
| `zod` resolve error | Missing dep | `cd mcp && npm install` |

## Operational patterns

**Check Talia is alive:**
```
talia_status()
```

**Quick question:**
```
talia_ask("What's on my calendar today?")
```

**Delegate a complex task to Talia:**
```
talia_ask("SSH to pironman and check if all Docker containers are healthy. Report any that are not running.", timeout=300)
```

**Send a Telegram notification:**
```
talia_message_send("Deployment complete", "123456789")
```
(Get personal chat ID from vault: `get-secret "Personal AI Telegram Chat ID"`)

---
name: talia-connector
description: Use when interacting with Talia (personal AI assistant on OpenClaw/Raspberry Pi). Triggers on talia_ask, talia_status, talia_memory_search, talia_sessions, talia_cron_list, talia_cron_run, talia_message_send, "ask Talia", "check Talia", "Talia's memory", "send Telegram", or any operation against the Talia MCP server.
---

# Talia Connector

MCP bridge to Talia — personal AI assistant running on OpenClaw gateway on Raspberry Pi (100.120.127.35). Provides 7 tools and 2 resources.

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
List all scheduled cron jobs (heartbeat, reports, Dream distillation, etc.) with status and next run time.

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

The MCP server runs in **stdio mode** on the Mac — it SSHes to `raspberrypi` to run openclaw commands.

**Requirements:**
- `ssh raspberrypi` must work without password (key-based auth via Tailscale)
- `openclaw` must be in `~/.npm-global/bin/` on the Pi (symlink at `/usr/local/bin/openclaw`)
- OpenClaw gateway must be running on the Pi (`systemctl --user status openclaw-gateway.service`)
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
| `Error: ssh: connect to host raspberrypi` | Tailscale down or Pi offline | `tailscale status`, check Pi is online |
| `Timed out after 30000ms` | openclaw slow or unresponsive | `ssh raspberrypi "systemctl --user status openclaw-gateway.service"` |
| Port 18789 unreachable | Gateway not running | `ssh raspberrypi "systemctl --user restart openclaw-gateway.service"` |

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
talia_ask("Check if there are urgent unread emails and summarize them.", timeout=300)
```

**Send a Telegram notification:**
```
talia_message_send("Deployment complete", "8347281677")
```

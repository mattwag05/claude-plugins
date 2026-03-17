# talia-connector

MCP bridge to Talia (personal AI assistant) via OpenClaw on Raspberry Pi.

## What It Does

Exposes 7 tools and 2 resources for interacting with Talia — the personal AI assistant running on OpenClaw gateway on a Raspberry Pi. The MCP server runs locally (stdio transport) and SSHes to the Pi to execute `openclaw` commands.

## Setup

### 1. Prerequisites

- Tailscale VPN connected (`tailscale status`)
- SSH access to Pi: `ssh raspberrypi "openclaw status"` must succeed
- Node.js installed locally
- OpenClaw running on Pi

### 2. Install dependencies

```bash
cd mcp
npm install
```

### 3. Register in Claude Code

Add to `~/.claude.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "talia": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/talia-connector/mcp/talia-mcp.js"]
    }
  }
}
```

Replace `/path/to/talia-connector` with the actual plugin install path.

## Tools

| Tool | Purpose |
|------|---------|
| `talia_ask` | Send a prompt to Talia, get her response |
| `talia_status` | Check OpenClaw gateway health |
| `talia_memory_search` | Search Talia's indexed memory |
| `talia_sessions` | List active conversation sessions |
| `talia_cron_list` | List scheduled cron jobs |
| `talia_cron_run` | Manually trigger a cron job |
| `talia_message_send` | Send a Telegram message via OpenClaw |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSPORT` | `stdio` | `stdio` or `sse` |
| `PORT` | `3847` | SSE server port |
| `SSH_HOST` | `raspberrypi` | SSH target (stdio mode) |
| `LOCAL_MODE` | `false` | `true` = run openclaw directly (Pi Docker) |
| `OPENCLAW_BIN` | `openclaw` | Path to openclaw binary |

## Architecture

```
Claude Code (Mac) → stdio → talia-mcp.js → SSH → Pi:openclaw → OpenClaw Gateway → Talia
```

For Docker deployment on Pi (Streamable HTTP mode), see `Talia-Connector` repo on Forgejo.

# talia-connector

MCP bridge to Talia (personal AI assistant) via OpenClaw on Lume macOS VM.

## What It Does

Exposes 7 tools and 2 resources for interacting with Talia — the personal AI assistant running on OpenClaw gateway in a Lume macOS VM. The MCP server runs locally (stdio transport) and SSHes to the VM to execute `openclaw` commands.

## Setup

### 1. Prerequisites

- Tailscale VPN connected (`tailscale status`)
- SSH access to VM: `ssh lumes-virtual-machine "openclaw status"` must succeed
- Node.js installed locally
- OpenClaw running in the Lume macOS VM

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
| `SSH_HOST` | `lumes-virtual-machine` | SSH target (stdio mode) |
| `LOCAL_MODE` | `false` | `true` = run openclaw directly (local to VM) |
| `OPENCLAW_BIN` | `openclaw` | Path to openclaw binary |

## Architecture

```
Claude Code (Mac) → stdio → talia-mcp.js → SSH → VM:openclaw → OpenClaw Gateway → Talia
```

For Streamable HTTP mode, see `Talia-Connector` repo on Forgejo.

# talia-connector

MCP bridge to Talia (personal AI assistant), backed by local Hermes-Agent on the M5.

## What It Does

Exposes tools for interacting with Talia — the personal AI assistant running on
Hermes-Agent locally on the Mac. No SSH hop anymore.

- `talia_ask` → Hermes OpenAI-compatible API at `http://127.0.0.1:8642/v1/chat/completions`
- `talia_memory_search` / `talia_cron_list` / `talia_cron_run` → thin shim over the local `hermes` CLI
- `talia_status` / `talia_sessions` → same CLI shim
- `talia_message_send` → **deprecated**; use the `hermes` MCP server's `messages_send` tool instead

## Setup

### 1. Prerequisites

- Hermes-Agent running locally (`~/.hermes/` installed)
- Hermes gateway started with the API server on port 8642
  (`hermes gateway install && hermes gateway start`)
- `~/.local/bin/hermes` on PATH (or set `HERMES_BIN`)
- Node.js ≥ 22

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
      "args": ["/Users/matthewwagner/Desktop/Projects/claude-plugins/plugins/talia-connector/mcp/talia-mcp.js"]
    },
    "hermes": {
      "type": "stdio",
      "command": "/Users/matthewwagner/.local/bin/hermes",
      "args": ["mcp", "serve"],
      "env": { "HERMES_HOME": "/Users/matthewwagner/.hermes" }
    }
  }
}
```

The `hermes` entry is optional but recommended — it exposes the 10 messaging /
session bridge tools (`conversations_list`, `messages_send`, etc.) that
`talia_message_send` used to cover.

## Tools

| Tool | Path |
|------|------|
| `talia_ask` | `POST http://127.0.0.1:8642/v1/chat/completions` |
| `talia_status` | `hermes gateway status` |
| `talia_memory_search` | grep over `~/.hermes/memories/MEMORY.md` + `USER.md` |
| `talia_sessions` | `hermes sessions list` |
| `talia_cron_list` | `hermes cron list` |
| `talia_cron_run` | `hermes cron run <id>` |
| `talia_message_send` | deprecated — use `hermes` MCP server |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRANSPORT` | `stdio` | `stdio` or `sse` |
| `PORT` | `3847` | SSE server port |
| `HERMES_API` | `http://127.0.0.1:8642` | Hermes API server base URL |
| `HERMES_BIN` | `~/.local/bin/hermes` | Path to hermes CLI |
| `HERMES_HOME` | `~/.hermes` | Hermes home dir |
| `HERMES_MODEL` | `hermes-agent` | Model name sent to API |

## Architecture

```
Claude Code (Mac) → stdio → talia-mcp.js
  ├── talia_ask          → HTTP → 127.0.0.1:8642 → Hermes API server → Ollama/model
  ├── talia_*_search     → grep → ~/.hermes/memories/*.md
  └── talia_cron/sessions → exec → hermes CLI → state.db
```

## Migration note (April 2026)

v2.0.0 replaced the SSH→OpenClaw path with local Hermes-Agent. The old v1 path
(`SSH → lumes-virtual-machine → openclaw`) is gone. Rollback: `git checkout
v1.0.0 -- mcp/ .claude-plugin/ README.md` and restore `~/.hermes` from
`~/.hermes-backup-20260423`.

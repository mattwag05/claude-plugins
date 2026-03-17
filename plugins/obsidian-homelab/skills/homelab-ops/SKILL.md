---
name: homelab-ops
description: Operate and troubleshoot Matt's self-hosted homelab — Docker services on Pironman and Raspberry Pi, Pi-hole DNS, Talia/OpenClaw, Forgejo, Tailscale networking, and LaunchAgents on the MacBook Air. Use when asked to check service status, restart containers, debug DNS, or manage infrastructure.
---

# Homelab Ops

This skill covers day-to-day operations of Matt's self-hosted homelab. Reference `~/.claude/references/docker-homelab.md` for the full services table and `~/.claude/references/service-gotchas.md` for per-service config issues.

---

## Network Topology

| Host | Role | Tailscale IP | Primary Access |
|------|------|-------------|----------------|
| MacBook Air (M4) | Workstation, CI runner | 100.85.213.42 | local |
| Pironman (Pi 5) | Primary homelab host | 100.75.2.44 | `ssh pironman` |
| Raspberry Pi | Secondary host, Pi-hole secondary | 100.120.127.35 | `ssh raspberrypi` |

---

## Docker / Compose

All Pironman services are in `~/homelab/docker/compose/` (one sub-folder per stack).

### Common patterns

```bash
# Check running containers
ssh pironman "docker ps"

# Restart a stack
ssh pironman "cd ~/homelab/docker/compose/<stack> && docker compose restart"

# Full stop + start (required when gluetun restarts)
ssh pironman "cd ~/homelab/docker/compose/<stack> && docker compose stop && docker compose rm -f && docker compose up -d"

# View logs
ssh pironman "docker logs <container> --tail 50 -f"

# Check resource usage
ssh pironman "docker stats --no-stream"
```

### gluetun restart rule

When gluetun restarts, all containers that use `network_mode: service:gluetun` must be fully stopped, removed, and re-created — `docker compose restart` is not sufficient for network_mode containers.

```bash
ssh pironman "cd ~/homelab/docker/compose/gluetun && docker compose stop && docker compose rm -f && docker compose up -d"
# then restart dependent containers in same fashion
```

---

## Pi-hole DNS

| Role | Host | Admin URL |
|------|------|-----------|
| Primary | Pironman (100.75.2.44) | http://100.75.2.44/admin |
| Secondary | raspberrypi (100.120.127.35) | http://100.120.127.35/admin |

```bash
# Update blocklists
ssh pironman "docker exec pihole pihole -g"

# Check query log
ssh pironman "docker exec pihole pihole -t"

# Whitelist a domain
ssh pironman "docker exec pihole pihole --white-list example.com"

# Check Pi-hole status
ssh pironman "docker exec pihole pihole status"
```

Full gotchas: `~/.claude/references/service-gotchas.md` and CCL `contexts/technical/pihole-config.md`.

---

## Talia / OpenClaw

OpenClaw is the active AI assistant backend (restored 2026-03-15 after GrimClaw instability).

```bash
# Check OpenClaw status on Pi
ssh raspberrypi "systemctl --user status openclaw"

# View OpenClaw logs
ssh raspberrypi "journalctl --user -u openclaw -n 50"

# Restart OpenClaw
ssh raspberrypi "systemctl --user restart openclaw"
```

Full config: `~/.claude/references/openclaw.md`

Talia MCP tools available in this session:
- `mcp__talia__talia_status` — check Talia service health
- `mcp__talia__talia_sessions` — list active sessions
- `mcp__talia__talia_ask` — send a message to Talia
- `mcp__talia__talia_message_send` — send message to a session
- `mcp__talia__talia_memory_search` — search Talia memory
- `mcp__talia__talia_cron_list` — list scheduled crons
- `mcp__talia__talia_cron_run` — trigger a cron manually

---

## Forgejo

Self-hosted git at `https://forgejo.tail6e035b.ts.net`.

```bash
# Check Forgejo API health
curl -s https://forgejo.tail6e035b.ts.net/api/v1/version

# Get admin credentials
get-secret "Forgejo Admin Credentials"

# List repos
curl -s -u "matthewwagner:$(get-secret 'Forgejo Admin Credentials')" \
  https://forgejo.tail6e035b.ts.net/api/v1/repos/search | python3 -c "import sys,json; [print(r['full_name']) for r in json.load(sys.stdin)['data']]"
```

Forgejo CI/CD uses `act_runner` on the MacBook Air. See CLAUDE.md for runner registration details.

---

## MacBook Air LaunchAgents

LaunchAgents live in `~/Library/LaunchAgents/`. Manage with `launchctl`.

```bash
# List all loaded agents
launchctl list | grep com.matthewwagner

# Check a specific agent
launchctl print gui/$(id -u)/com.matthewwagner.<name>

# Load an agent
launchctl load ~/Library/LaunchAgents/com.matthewwagner.<name>.plist

# Unload an agent
launchctl unload ~/Library/LaunchAgents/com.matthewwagner.<name>.plist

# Check vault-serve health
vault-health
```

Key LaunchAgents:
- `com.matthewwagner.vault-serve` — Vaultwarden daemon (KeepAlive=true)
- Grimclaw relay: disabled (plist moved to `~/Library/LaunchAgents/.disabled/` 2026-03-15)

**PATH gotcha:** LaunchAgent PATH applies only to the launched process, not to `/bin/sh` subshells it spawns. Scripts that call vault wrappers must use full paths (`/Users/matthewwagner/.local/bin/get-secret`).

---

## Tailscale

```bash
# Check network status
tailscale status

# Generate HTTPS cert for a service
tailscale cert --cert-file <path> --key-file <path> <hostname>.tail6e035b.ts.net

# Ping a host
tailscale ping pironman
```

---

## Reference Files

- `references/` — extended homelab documentation
- `~/.claude/references/docker-homelab.md` — full deployed services table
- `~/.claude/references/service-gotchas.md` — per-service config issues
- `~/.claude/references/openclaw.md` — OpenClaw/Talia config

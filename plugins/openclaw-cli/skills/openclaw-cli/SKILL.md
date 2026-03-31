---
description: >
  OpenClaw CLI usage patterns for managing Talia (personal AI assistant) on
  Pironman. Activate when user mentions openclaw CLI, openclaw config, openclaw
  gateway, openclaw cron, openclaw security, or managing Talia's infrastructure.
  Also activate when SSH-ing to Pironman to run openclaw commands.
---

# OpenClaw CLI Reference

## ENFORCEMENT RULE

**Always use the OpenClaw CLI for all configuration changes. Never directly edit OpenClaw JSON files.**

Direct edits to `openclaw.json`, `auth-profiles.json`, `models.json`, or any other file under `~/.openclaw/` are forbidden. They bypass schema validation, break config persistence, and can corrupt runtime state. The CLI is the only supported path.

If a CLI command fails, investigate and fix the CLI invocation — do not fall back to direct file edits.

Talia runs on **Pironman** (`100.75.2.44`) via the OpenClaw framework.
All CLI commands must be run with the correct PATH.

## SSH Prefix (required for all openclaw commands)

```bash
ssh pironman "export PATH=\$HOME/.npm-global/bin:\$PATH NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache OPENCLAW_NO_RESPAWN=1 && openclaw <subcommand>"
```

The env vars (`NODE_COMPILE_CACHE`, `OPENCLAW_NO_RESPAWN`) reduce startup time on the Pi.

---

## Health & Diagnostics

```bash
# Full health check — run first to see what's broken
openclaw doctor

# Apply safe fixes (file permissions, config tightening)
openclaw doctor --fix
```

**Known intentional warning:** `channels.telegram.groupPolicy is "allowlist" but groupAllowFrom is empty` — this is deliberate (Talia only responds to direct messages, not group messages).

---

## Gateway Lifecycle

```bash
openclaw gateway install --force --port 18789 --token <token>
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
openclaw gateway status
openclaw gateway probe          # Check gateway connectivity
```

**Production service:** `systemctl --user status openclaw-gateway.service`
- Unit file: `~/.config/systemd/user/openclaw-gateway.service`
- Token: `OPENCLAW_GATEWAY_TOKEN` env var in the unit file
- Port: 18789
- Added env vars: `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`, `OPENCLAW_NO_RESPAWN=1`

**Note on `gateway install`:** The CLI's `is-enabled` check fails in non-interactive SSH sessions (no D-Bus). If install fails, write the unit file manually and enable it with `systemctl --user enable --now`.

---

## Config Management

```bash
openclaw config get                          # Show full config
openclaw config get gateway.port             # Get specific key
openclaw config set gateway.port 18789       # Set a value
openclaw config unset some.key               # Remove a key
openclaw config validate                     # Validate config schema
```

Config file: `~/.openclaw/openclaw.json` (chmod 600, contains Telegram bot token)

---

## API Keys & Inference Credentials

Inference provider API keys (e.g. OpenRouter) are stored in per-agent credential files, NOT in `openclaw.json`. The only supported way to set or rotate them is via the interactive configure wizard, which requires a TTY — use `ssh -t`:

```bash
# Interactive wizard — set or rotate OpenRouter (or other provider) API key
ssh -t pironman "export PATH=\$HOME/.npm-global/bin:\$PATH NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache OPENCLAW_NO_RESPAWN=1 && openclaw configure --section model"
```

After updating credentials, audit and restart:

```bash
ssh pironman "export PATH=\$HOME/.npm-global/bin:\$PATH OPENCLAW_NO_RESPAWN=1 && openclaw secrets audit && systemctl --user restart openclaw-gateway.service && systemctl --user is-active openclaw-gateway.service"
```

**Why `ssh -t`:** The configure wizard is interactive (prompts + selection menus). Without a pseudo-TTY (`-t`), the process exits immediately. The `-t` flag allocates one for the SSH session.

---

## Security

```bash
openclaw security audit              # Quick audit
openclaw security audit --deep       # Full audit with all checks
openclaw security audit --fix        # Apply safe permission fixes
openclaw secrets audit               # Audit secrets/credentials
openclaw secrets configure           # Configure secrets management
openclaw secrets reload              # Reload secrets without restart
```

**Known security warnings (benign):**
- `gateway.trusted_proxies_missing` — gateway is localhost-only, not behind a reverse proxy
- `gateway.nodes.deny_commands_ineffective` — some denyCommands entries use unknown command names (harmless)

---

## Cron Jobs

```bash
openclaw cron list                   # List all scheduled jobs
openclaw cron add                    # Interactive: add new cron job
openclaw cron edit <job-id>          # Edit existing job
openclaw cron rm <job-id>            # Remove a job
openclaw cron enable <job-id>        # Enable a disabled job
openclaw cron disable <job-id>       # Disable a job
openclaw cron run <job-id>           # Manually trigger a job now
```

**Gotcha:** Cron jobs hardcode `payload.model` per-job — NOT inherited from `openclaw.json`. Use exact model IDs with version suffixes (e.g., `google/gemini-2.0-flash-001` not `google/gemini-2.0-flash`).

Config file: `~/.openclaw/cron/jobs.json` — structure: `{"version":..., "jobs":[...]}` (`jobs` is a list).

---

## Runtime Management

```bash
openclaw sessions list               # List active conversation sessions
openclaw sessions rm <session-id>    # Remove a session
openclaw agents list                 # List configured agents
openclaw channels list               # List configured channels
openclaw memory list                 # List memory files
openclaw message send --channel telegram "Hello"   # Send message via channel
```

---

## Workspace Backup

Workspace: `~/.openclaw/workspace/` (git repo, branch `main`)
Remote: `https://forgejo.tail6e035b.ts.net/matthewwagner/talia-workspace.git`
Script: `~/.local/bin/talia-backup.sh` (run by `talia-backup.service` at 23:59 daily)

```bash
# Manual backup
ssh pironman "~/.local/bin/talia-backup.sh"

# Check backup timer
ssh pironman "systemctl --user status talia-backup.timer"
ssh pironman "systemctl --user list-timers talia-backup.timer"

# Verify on Forgejo
curl -s "https://forgejo.tail6e035b.ts.net/api/v1/repos/matthewwagner/talia-workspace/commits?limit=3" \
  -u "matthewwagner:$(get-secret 'Forgejo Admin Credentials')" | python3 -c "
import json,sys
for c in json.load(sys.stdin):
    print(c['sha'][:8], c['commit']['message'][:60])
"
```

**Training workflow** (update Talia's workspace files):
```bash
# Edit files locally, then:
scp local-file.md raspberrypi:~/.openclaw/workspace/
ssh pironman "cd ~/.openclaw/workspace && git add -A && git commit -m 'Training: description'"
```

---

## Common Troubleshooting

```bash
# Gateway not responding
ssh pironman "systemctl --user restart openclaw-gateway.service"
ssh pironman "journalctl --user -u openclaw-gateway.service -n 50 --no-pager"

# Check Talia's recent session behavior
ssh pironman "ls -lt ~/.openclaw/agents/main/sessions/*.jsonl | head -3"

# Reset Talia's session (reduces context from ~63k to ~14k tokens)
# Send /reset via Telegram

# OpenClaw update
ssh pironman "export PATH=\$HOME/.npm-global/bin:\$PATH && npm install -g openclaw"
# After update: re-check gateway unit file (ExecStart path may change between index.js/entry.js)
```

# Service Quick Reference

---

## Pironman (Pi 5) Services

SSH: `ssh pironman` (Tailscale: 100.75.2.44)
Compose root: `~/homelab/docker/compose/`

| Service | Container | Compose folder | URL | Notes |
|---------|-----------|----------------|-----|-------|
| Pi-hole (primary) | pihole | pihole/ | http://100.75.2.44/admin | DNS ad-blocker |
| Jellyfin | jellyfin | media-stack/ | https://jellyfin.tail6e035b.ts.net | Media server |
| qBittorrent | qbittorrent | media-stack/ | via gluetun | VPN torrent client |
| Gluetun | gluetun | gluetun/ | — | VPN container |
| Seafile | seafile | seafile/ | https://seafile.tail6e035b.ts.net | File sync |
| Forgejo | forgejo | forgejo/ | https://forgejo.tail6e035b.ts.net | Self-hosted git |
| Caddy | caddy | caddy/ | — | Reverse proxy |
| Beszel | beszel | beszel/ | https://beszel.tail6e035b.ts.net | Server monitoring |
| Scanopy | scanopy | scanopy/ | — | Document scanner |
| Hawser | hawser | hawser/ | — | SSH bastion |
| Minecraft | minecraft | minecraft/ | — | Game server |
| ntfy | ntfy | ntfy/ | https://ntfy.tail6e035b.ts.net | Push notifications |

---

## Raspberry Pi Services

SSH: `ssh raspberrypi` (Tailscale: 100.120.127.35)

| Service | Type | Notes |
|---------|------|-------|
| Pi-hole (secondary) | Docker | ~/pihole/ compose |
| Talia / OpenClaw | systemd user service | `systemctl --user status openclaw` |
| vault-serve | systemd user service | `systemctl --user status vault-serve` |
| DeepTutor | Docker | ~/Projects/DeepTutor/ |
| talia-voice | Docker | ~/talia-voice/ |

---

## MacBook Air (M4) Services

Tailscale: 100.85.213.42

| Service | Type | Notes |
|---------|------|-------|
| vault-serve | LaunchAgent | com.matthewwagner.vault-serve |
| act_runner | Homebrew service | `brew services start act_runner` |

---

## Common Patterns

### Start/stop/restart a compose stack

```bash
# Restart a stack
ssh pironman "cd ~/homelab/docker/compose/<folder> && docker compose restart"

# Stop and remove containers, then bring back up
ssh pironman "cd ~/homelab/docker/compose/<folder> && docker compose down && docker compose up -d"

# Pull latest images and redeploy
ssh pironman "cd ~/homelab/docker/compose/<folder> && docker compose pull && docker compose up -d"
```

### View logs

```bash
# Follow logs for a container
ssh pironman "docker logs -f <container>"

# Last 100 lines
ssh pironman "docker logs --tail 100 <container>"

# Logs from a compose stack
ssh pironman "cd ~/homelab/docker/compose/<folder> && docker compose logs -f"
```

### Gluetun restart rule

> WARNING: If gluetun restarts, all containers using `network_mode: service:gluetun` (e.g., qbittorrent) lose their network and need a full `stop + rm + up` cycle — `docker compose restart` alone does not fix them.

```bash
# Correct gluetun recovery sequence
ssh pironman "cd ~/homelab/docker/compose/gluetun && docker compose down && docker compose up -d"
# Then restart any affected sidecars
ssh pironman "cd ~/homelab/docker/compose/media-stack && docker compose down qbittorrent && docker compose up -d qbittorrent"
```

### Check all running containers

```bash
ssh pironman "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
ssh raspberrypi "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

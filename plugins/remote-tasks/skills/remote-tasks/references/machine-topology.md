# Machine Topology

Tailscale network topology and capabilities for the remote-tasks delegation system.

## Machines

### MacBook Air (air)
- **Tailscale IP:** 100.85.213.42
- **Hostname:** matthews-macbook-air
- **Role:** Coordinator — runs Claude Code sessions, delegates tasks
- **Has worker:** No (coordination only)
- **SSH:** Inbound via Tailscale only

### Raspberry Pi (pi)
- **Tailscale IP:** 100.120.127.35
- **Hostname:** raspberrypi
- **Role:** Lightweight task worker
- **Has worker:** Yes
- **Capabilities:** `task-worker`
- **Services:** OpenClaw gateway, Talia voice pipeline, Pi-hole (secondary)
- **SSH:** `ssh raspberrypi` or `ssh 100.120.127.35`

### Pironman (pironman)
- **Tailscale IP:** 100.75.2.44
- **Hostname:** pironman
- **Role:** Heavy task worker + Docker host
- **Has worker:** Yes
- **Capabilities:** `task-worker`, `ntfy-server`
- **Services:** Jellyfin, Seafile, Pi-hole (primary), DeepTutor, Beszel, qBittorrent, Minecraft, ntfy
- **SSH:** `ssh pironman` or `ssh 100.75.2.44`
- **ntfy:** `http://pironman:8080/remote-tasks` (for worker wake signals)

## Task Routing Heuristics

| Task Type | Preferred Machine | Reason |
|-----------|------------------|--------|
| Docker management | pironman | Most services run there |
| Pi-hole gravity update | pi or pironman | Both have Pi-hole |
| Media library scan | pironman | Jellyfin runs there |
| Voice/Talia | pi | OpenClaw runs there |
| General compute | pi | Lighter, faster SSH |
| Long-running (hours) | pironman | More stable, always-on |

## Connectivity

All machines are connected via Tailscale VPN (`tail6e035b.ts.net`). Direct LAN connectivity is not required — all task delegation, SSH exec, and ntfy notifications go over the Tailscale overlay network.

```
MacBook Air (coordinator)
    │
    ├── ssh raspberrypi (100.120.127.35) [Tailscale]
    │       └── bd worker daemon
    │       └── openclaw gateway
    │
    └── ssh pironman (100.75.2.44) [Tailscale]
            └── bd worker daemon
            └── ntfy server :8080
            └── docker compose stack
```

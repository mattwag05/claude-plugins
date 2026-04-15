# Dockhand — Full Reference

Extended operational reference for Dockhand on Pironman. For the tight overview and day-to-day commands, see [`../SKILL.md`](../SKILL.md) § Dockhand.

UI: `https://dockhand.tail6e035b.ts.net` (caddy-tailscale). Image: `fnsys/dockhand:latest`. License: BSL 1.1. SQLite DB: `/app/data/db/dockhand.db` inside the container, backed by the `dockhand_dockhand_data` docker volume.

---

## Auto-update pipeline

A single cron (`env_update_check`) executes at **04:00 America/New_York** daily and runs scan → CVE evaluation → apply in one pass. There is no separate "apply" cron — the misleadingly-named check IS the apply.

Per container, per run:

1. Query the registry for a newer image digest matching the image's tag
2. If a new digest is found, pull to a `<image>:<tag>-dockhand-pending` staging tag
3. Scan the pending image with **Grype** AND **Trivy** (both run, results merged)
4. Compare the worst severity found against the env's `vulnerabilityCriteria`:
   - `never` — deploy regardless of CVE findings
   - `critical_high` — block if any Critical or High CVE is present in the new image
   - `critical` — block only on Critical
5. Pass: atomic re-tag to the real tag, recreate container via compose, delete the pending tag
6. Block: delete the pending tag, container stays on the old image, record a block event in the execution log

Execution history lives in the `schedule_executions` table and is surfaced in Dockhand UI at Schedules → expand a schedule row.

Manual trigger: Schedules page → "Run now" (play icon) on a specific schedule. A no-op manual run (nothing to update) takes ~10s. A run with real pulls runs 30s–7m depending on how many images changed.

---

## Config locations

| What | UI path | DB location |
|---|---|---|
| Enable/disable schedule | Settings → Environments → <env> → Updates | `settings.env_<id>_update_check.enabled` |
| Cron schedule | Same | `settings.env_<id>_update_check.cron` |
| Auto-apply toggle | Same | `settings.env_<id>_update_check.autoUpdate` |
| Vulnerability gate | Same | `settings.env_<id>_update_check.vulnerabilityCriteria` |
| Per-container override | Containers → <container> → Auto-update (rarely used) | `auto_update_settings` table |

The `auto_update_settings` table is the container-level override layer; it's normally empty and everything inherits from the env-level blob at `settings.env_<id>_update_check`.

Inspect the Pironman env config directly:

```bash
ssh pironman 'docker exec dockhand sqlite3 /app/data/db/dockhand.db "SELECT value FROM settings WHERE key = '\''env_1_update_check'\'';"'
```

List currently-adopted (Internal) stacks from the DB:

```bash
ssh pironman 'docker exec dockhand sqlite3 -header /app/data/db/dockhand.db "SELECT s.id, s.name, s.source, e.name AS env FROM git_stacks s JOIN environments e ON s.environment_id = e.id;"'
```

(Table name varies by version. If `git_stacks` is empty, check `stack_sources` or list the full schema with `.tables`.)

---

## "Never block" Save trap

The env Updates UI displays `"Critical or high"` as the default for "Block updates with vulnerabilities", but the DB default in the `auto_update_settings.vulnerability_criteria` column is `'never'`, AND the env-level JSON blob at `settings.env_1_update_check` also stores `"never"` unless explicitly saved. If the env Updates dialog is opened and closed without an explicit **Save**, the UI shows the target value but the schedule runs with `"never"` — scans happen, CVEs are noted, nothing gets blocked.

**Symptom:** execution details for a run show `Update block criteria: Never block` even though the env settings UI shows "Critical or high".

**Fix:** Open Settings → Environments → <env> → Updates, confirm "Block updates with vulnerabilities" is set correctly, and **click Save**. Verify via SQLite:

```bash
ssh pironman 'docker exec dockhand sqlite3 /app/data/db/dockhand.db "SELECT value FROM settings WHERE key = '\''env_1_update_check'\'';"'
# expected: "vulnerabilityCriteria": "critical_high"
```

---

## Adopting stacks (taking ownership of compose files)

Dockhand distinguishes **Untracked** stacks (visible via `docker ps` but compose file is external) from **Internal** stacks (Dockhand owns the compose file and can update the whole stack atomically). Adoption matters for stacks with inter-container dependencies — especially gluetun's `network_mode: service:gluetun`, which needs coordinated recreation that Dockhand only handles atomically for Internal stacks.

### Bind-mount prerequisite

Dockhand's filesystem browser can only see paths mounted into the Dockhand container. The compose source tree must be bind-mounted at the **same path** inside the container so that paths resolve consistently whether Dockhand reads them directly or passes them through the Docker socket to the host daemon.

Configured in `~/homelab/docker/compose/dockhand/docker-compose.yml`:

```yaml
services:
  dockhand:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - dockhand_data:/app/data
      - /home/matthewwagner/homelab/docker/compose:/home/matthewwagner/homelab/docker/compose
```

After adding or changing this mount, recreate the container:

```bash
ssh pironman "cd ~/homelab/docker/compose/dockhand && docker compose up -d"
```

### Adoption workflow

1. Stacks page → **Adopt** button
2. Navigate to `/home/matthewwagner/homelab/docker/compose/`
3. Click **Scan this folder** — Dockhand walks the tree and finds every `docker-compose.yml`
4. Check the stacks to adopt, click **Adopt N stack(s)**
5. Adopted stacks now show Source = **Internal**

### Stacks outside the compose tree

`caddy-tailscale` lives at `~/caddy-homelab/pironman/` and is NOT under the bind mount, so it cannot be adopted as-is. It's still visible to Dockhand via `docker ps` (image `ghcr.io/tailscale/caddy-tailscale:main`), so the env-wide auto-update still applies to it at the container level — just not as part of an atomic stack update. To adopt it later, either add a second bind mount for `~/caddy-homelab/` or move caddy's compose directory into the main tree.

---

## Manual update fallbacks

**Adopted stack:** Dockhand UI → Stacks → click stack → "Update" button (pulls images and redeploys).

**Untracked stack or Dockhand unavailable:**

```bash
ssh pironman "cd ~/homelab/docker/compose/<stack> && docker compose pull && docker compose up -d"
```

For `network_mode: service:gluetun` containers, use the full stop + rm + up pattern instead of `restart` (see the gluetun restart rule in SKILL.md).

---

## Other notes

- `env_update_check` in log lines is the full scan+apply schedule, not a check-only phase. If you see "0 container schedules" in the scheduler registration log, that refers to the count of per-container CUSTOM schedules in `auto_update_settings`, not to whether env-wide auto-update is running.
- Image pruning runs on a separate cron (weekly Sunday 03:00 local time), dangling-images-only by default. Configured alongside the update schedule on the Updates tab.
- The dockhand container exposes a healthcheck on `http://localhost:3000/` — the compose file's healthcheck block is the canonical source of truth for container health status.

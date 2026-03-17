# Tag Taxonomy — Matt's Vault

Complete tag hierarchy with descriptions. Use this reference when tagging notes or searching by tag.

---

## Source Tags (`#source/*`)

Medical publisher/organization tags:

| Tag | Source | Example content |
|-----|--------|----------------|
| `#source/cochrane` | Cochrane Collaboration | Systematic reviews, meta-analyses |
| `#source/guideline` | Clinical practice guidelines | Evidence-based guidelines |
| `#source/ppip` | Primary Care Companion in CNS Disorders | Psychiatry-focused resources |
| `#source/pocg` | Point-of-Care Guides | Quick reference guides |
| `#source/lown` | Lown Institute | Right care, avoiding overtreatment |
| `#source/ahrq` | Agency for Healthcare Research & Quality | Evidence syntheses |
| `#source/fpin` | Family Physicians Inquiries Network | Practical clinical evidence |

---

## Specialty Tags (`#specialty/*`)

Medical specialty area:

| Tag | Specialty |
|-----|----------|
| `#specialty/cardiology` | Cardiology |
| `#specialty/pediatrics` | Pediatrics |
| `#specialty/psychiatry` | Psychiatry / behavioral health |
| `#specialty/orthopedics` | Orthopedics / musculoskeletal |
| `#specialty/respiratory` | Pulmonology / respiratory |
| `#specialty/oncology` | Oncology / hematologic malignancies |
| `#specialty/obgyn` | Obstetrics & gynecology |
| `#specialty/gastroenterology` | Gastroenterology / GI |
| `#specialty/neurology` | Neurology |
| `#specialty/endocrinology` | Endocrinology / diabetes |
| `#specialty/rheumatology` | Rheumatology / autoimmune |
| `#specialty/nephrology` | Nephrology / renal |
| `#specialty/dermatology` | Dermatology |
| `#specialty/hematology` | Hematology (non-oncologic) |
| `#specialty/infectious-disease` | Infectious disease |

---

## Type Tags (`#type/*`)

Document format:

| Tag | Meaning |
|-----|---------|
| `#type/guideline` | Clinical practice guideline |
| `#type/systematic-review` | Systematic review or meta-analysis |
| `#type/evidence` | Evidence summary |
| `#type/research` | Original research paper |
| `#type/educational` | Educational/teaching material |

---

## Homelab Tags (`#homelab/*`)

Self-hosted service notes:

| Tag | Service | Notes |
|-----|---------|-------|
| `#homelab/pihole` | Pi-hole | DNS ad-blocker (dual instance: Pironman + Pi) |
| `#homelab/jellyfin` | Jellyfin | Self-hosted media server |
| `#homelab/talia` | Talia / OpenClaw | AI assistant on Raspberry Pi |
| `#homelab/vaultwarden` | Vaultwarden | Self-hosted Bitwarden-compatible password vault |
| `#homelab/forgejo` | Forgejo | Self-hosted git hosting |
| `#homelab/caddy` | Caddy | Reverse proxy with auto-TLS |
| `#homelab/gluetun` | Gluetun | VPN container sidecar |
| `#homelab/seafile` | Seafile | File sync and cloud storage |
| `#homelab/pironman` | Pironman (Pi 5) | Primary homelab server |
| `#homelab/raspberrypi` | Raspberry Pi | Secondary server (Pi-hole secondary, Talia, DeepTutor) |

---

## Project Tags (`#project/*`)

| Tag | Meaning |
|-----|---------|
| `#project/active` | Currently in progress |
| `#project/paused` | On hold |
| `#project/completed` | Done |
| `#project/idea` | Not started, worth tracking |

---

## Priority Tags (`#priority/*`)

| Tag | Meaning |
|-----|---------|
| `#priority/high` | Urgent or high-stakes |
| `#priority/medium` | Normal priority |
| `#priority/low` | Nice-to-have |

---

## Search Examples

```bash
# Find all active projects
obsidian search query="tag:#project/active" vault="Matt's Vault" format=json

# Find high-priority homelab notes
obsidian search query="tag:#priority/high tag:#homelab" vault="Matt's Vault" format=json

# Find all Cochrane reviews
obsidian search query="tag:#source/cochrane" vault="Matt's Vault" format=json

# Find psychiatry guidelines
obsidian search query="tag:#specialty/psychiatry tag:#type/guideline" vault="Matt's Vault" format=json

# Find all paused projects
obsidian search query="tag:#project/paused" vault="Matt's Vault" format=json

# Find Talia-related notes
obsidian search query="tag:#homelab/talia" vault="Matt's Vault" format=json

# Find evidence summaries for cardiology
obsidian search query="tag:#specialty/cardiology tag:#type/evidence" vault="Matt's Vault" format=json

# Find all educational materials
obsidian search query="tag:#type/educational" vault="Matt's Vault" format=json
```

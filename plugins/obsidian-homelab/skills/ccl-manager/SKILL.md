---
name: ccl-manager
description: Manage the Claude Context Library (CCL) — a curated Obsidian vault of technical references used to give Claude persistent knowledge across sessions. Use when adding a new context document, updating an existing one, or auditing what's in the CCL.
---

# CCL Manager

The Claude Context Library (CCL) is a dedicated Obsidian vault containing technical reference documents that give Claude persistent knowledge across sessions. It is separate from Matt's Vault and optimized for machine-readable content.

---

## Vault Location

```
~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Claude Context Library/
```

Stats (as of 2026-03-10): ~280 files.

---

## CCL Structure

```
Claude Context Library/
  contexts/
    medical/           — clinical writing patterns, SOAP templates
    technical/         — infrastructure, code, tool references
      apple-hig/       — 169 pages of Apple HIG (harvested 2026-03-08)
    obsidian/          — vault conventions and tag taxonomy
  known-docs.md        — registry of all harvested documentation sets
```

---

## Existing Contexts

| File | Domain | Last Updated |
|------|--------|-------------|
| `contexts/medical/clinical-writing.md` | SOAP notes, discharge summaries | 2026-03-07 |
| `contexts/technical/code-documentation.md` | READMEs, API docs | 2026-01-19 |
| `contexts/technical/pihole-config.md` | Dual Pi-hole, Unbound, nebula-sync | 2026-03-07 |
| `contexts/obsidian/vault-conventions.md` | Vault structure, tagging, placement | 2026-03-07 |
| `contexts/technical/apple-hig/` | Apple HIG — 169 pages | 2026-03-08 |

---

## Adding a New Context Document

### Small single-file contexts (direct filesystem write recommended)

Direct filesystem write is faster and doesn't require Obsidian to be open:

1. Compose the content (use obsidian-markdown skill for frontmatter)
2. Write directly to the CCL path using the Write tool:
   ```
   ~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Claude Context Library/contexts/<domain>/<name>.md
   ```
3. Register in `known-docs.md` if it's a named documentation set

### Large multi-file documentation harvests

Use the `doc-harvest` plugin for bulk content (entire libraries, API docs, large sites).

After a doc-harvest:
- Source files land in the configured output path
- Register the set in `known-docs.md` with name, source URL, page count, and date harvested

---

## known-docs.md

This file is the registry of all documentation sets in the CCL. Update it whenever a new set is harvested.

Format:
```markdown
## <name>

- **Source:** <URL or description>
- **Pages:** <count>
- **Harvested:** <YYYY-MM-DD>
- **Path:** `contexts/<domain>/<folder-or-file>`
- **Notes:** <any gotchas or access patterns>
```

Read it:
```bash
obsidian read "known-docs.md" vault="Claude Context Library"
```

---

## Updating an Existing Context

For small additions, use append:
```bash
obsidian append "contexts/technical/pihole-config.md" vault="Claude Context Library" content="## Update YYYY-MM-DD\n\n<new content>"
```

For full rewrites, use direct filesystem write (faster than CLI for large content replacements).

---

## Auditing the CCL

### List all files
```bash
obsidian files vault="Claude Context Library" format=json
```

### Search for a topic
```bash
obsidian search "tailscale" vault="Claude Context Library" format=json
```

### Open CCL in Obsidian (if not already open)
```bash
open "obsidian://open?vault=Claude%20Context%20Library"
sleep 3
```

---

## Silent Fallback Warning

`vault=` silently falls back to the active vault if "Claude Context Library" is not open in Obsidian. Always verify the vault is open before using the CLI, or use direct filesystem writes to avoid this issue entirely.

---

## Reference Files

- `references/` — extended CCL documentation (populated as CCL evolves)

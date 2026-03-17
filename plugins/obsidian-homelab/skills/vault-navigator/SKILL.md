---
name: vault-navigator
description: Navigate, audit, and maintain the structure of Matt's Vault. Use when asked to find notes, audit folder health, locate orphans, identify stale content, or understand where a new note should live. Knows the full numbered-folder taxonomy and naming conventions.
---

# Vault Navigator

Use this skill to understand, navigate, and maintain the structure of Matt's Vault. It knows the full folder taxonomy, naming conventions, and health-check patterns.

---

## Vault Location

```
~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Matt's Vault/
```

Stats (as of 2026-03-10): ~1,314 files, 54 tags, 63 tasks, 238 orphans.

---

## Folder Taxonomy

```
00-Meta/               — vault governance, templates, tag system, index files
01-Polaris/            — Polaris system: goals, anchors, weekly plans
10-Medical/
  Clinical-Practice/   — SOAP notes, patient care tools, clinical references
  Medical-Education/   — study notes, lectures, board prep
  Research-Papers/     — academic papers, summaries
20-Technology/
  AI-ML/
    Claude-Code/       — Claude guides, skill prompts, session notes
  Development/         — code, projects, APIs
  Infrastructure/
    Homelab/           — self-hosting, Docker, services
40-Projects/           — active projects with their own sub-folders
50-Personal/
  Travel/              — trip planning and memories
90-Archive/            — inactive/completed material, preserved for reference
99-Templates/          — Obsidian templates (used with Templater plugin)
```

Every folder should have an `_index.md` describing its purpose and linking to key notes.

---

## Placing a New Note

Use this decision tree to find the right folder for a new note:

1. Is it a clinical note, study material, or medical reference? → `10-Medical/`
   - Patient-facing or care-related → `Clinical-Practice/`
   - Board prep, lectures, education → `Medical-Education/`
   - Academic papers → `Research-Papers/`

2. Is it about code, infrastructure, or AI? → `20-Technology/`
   - Claude prompts, skills, session notes → `AI-ML/Claude-Code/`
   - Homelab services, Docker, networking → `Infrastructure/Homelab/`
   - Development projects, APIs → `Development/`

3. Is it an active multi-note project? → `40-Projects/<ProjectName>/`

4. Is it personal (travel, life admin, reflection)? → `50-Personal/`

5. Is it about goals, weekly planning, or Polaris anchors? → `01-Polaris/`

6. Is it a vault template? → `99-Templates/`

7. Is it unprocessed or not yet categorized? → `00-Inbox/` (triage, then move)

8. Is it completed/archived? → `90-Archive/`

---

## Naming Conventions

- Use `Title-Case-With-Hyphens.md` for most notes
- Use descriptive names — avoid dates in filenames unless the note is a dated log
- Folder `_index.md` files are always exactly `_index.md`
- Templates in `99-Templates/` use the format `Template-NoteType.md`

---

## Common Audit Commands

### Find all orphan notes
```bash
obsidian orphans vault="Matt's Vault" format=json
```

### Find all open tasks
```bash
obsidian tasks vault="Matt's Vault" format=md
```

### List all tags and counts
```bash
obsidian tags vault="Matt's Vault" sort=count counts
```

### List files in a specific folder
```bash
obsidian files path="10-Medical/" vault="Matt's Vault" format=json
```

### Search for notes with a specific tag
```bash
obsidian search query="tag:#project/active" vault="Matt's Vault" format=json
```

### Find notes without frontmatter type field
```bash
obsidian search query="NOT type:" vault="Matt's Vault" format=json
```

---

## Health Check Pattern

A healthy vault folder has:
- An `_index.md` with purpose statement and links to key notes
- All notes have required frontmatter (`type`, `tags`, `created`)
- No stale orphans that should be linked or archived
- Sub-folders only when there are 5+ related notes (avoid over-nesting)

Run this sequence to assess vault health:
```bash
obsidian orphans vault="Matt's Vault" format=json   # find disconnected notes
obsidian tasks vault="Matt's Vault" format=md       # find open tasks
obsidian tags vault="Matt's Vault" sort=count counts  # check tag usage
```

---

## Reference Files

- `references/` — additional vault structure documentation (populated as vault evolves)

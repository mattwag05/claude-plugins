---
name: obsidian-cli
description: Interact with Matt's Obsidian vaults (Matt's Vault and Claude Context Library) using the Obsidian CLI. Use when asked to read, create, search, or manage notes in either vault. Also supports plugin development commands.
---

# Obsidian CLI

The Obsidian CLI is built into Obsidian 1.12.4+ and communicates via IPC with the running Electron app. Always use it for reads and searches in Matt's Vault. Direct filesystem writes are acceptable for CCL and when creating files at known paths.

---

## Prerequisites

**Obsidian must be running.** All CLI commands fail silently or hang if the app is closed.

**Vault must be open.** If the target vault is not currently open in Obsidian, open it first:
```bash
open "obsidian://open?vault=Matt%27s%20Vault"
sleep 3
# or for CCL:
open "obsidian://open?vault=Claude%20Context%20Library"
sleep 3
```

**Locked screen blocks all commands.** When SSHing from iPhone via Tailscale, if the Mac screen is locked, all obsidian CLI calls will time out. Check idle time before running:
```bash
ioreg -n IOHIDSystem | grep HIDIdleTime
# divide result by 1e9 for seconds — if > ~300s, screen may be locked
```

**`obsidian help` hangs** — it launches the Electron app instead of printing help. Never use it in scripts.

---

## Vault Names and Paths

Always specify `vault=` explicitly. The CLI silently falls back to the currently active vault if the target vault is not open — no error, just wrong data.

| Vault | CLI Name | Filesystem Path |
|-------|----------|-----------------|
| Matt's Vault | `vault="Matt's Vault"` | `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Matt's Vault/` |
| Claude Context Library | `vault="Claude Context Library"` | `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Claude Context Library/` |

---

## Common Commands

### Read a note
```bash
obsidian read "10-Medical/Clinical-Practice/FCVS-Authorization.md" vault="Matt's Vault"
```

### Search notes
```bash
obsidian search "board exam" vault="Matt's Vault" format=json
obsidian search query="tag:#homelab" vault="Matt's Vault" format=md
```

### Create a note
```bash
obsidian create name="New Note" content="# Title\n\nBody text." vault="Matt's Vault" silent
# silent suppresses Obsidian UI pop-up
```

### Append to a note
```bash
obsidian append "50-Personal/Travel/Tanzania-Safari-Zanzibar-2026.md" vault="Matt's Vault" content="## Update\n\nNew content here."
```

### List files
```bash
obsidian files vault="Matt's Vault" format=json
obsidian files path="10-Medical/" vault="Matt's Vault"
```

### List tags
```bash
obsidian tags vault="Matt's Vault" sort=count counts
```

### List open tasks
```bash
obsidian tasks vault="Matt's Vault" format=md
```

### List orphan notes
```bash
obsidian orphans vault="Matt's Vault" format=json
```

### Move a note
```bash
obsidian move "00-Inbox/New Note.md" "40-Projects/My Project/New Note.md" vault="Matt's Vault"
```

### List properties on a note
```bash
obsidian properties "20-Technology/AI-ML/Claude-Code/calendar-organizer-skill-prompt.md" vault="Matt's Vault"
```

### List available vaults
```bash
obsidian vaults
```

---

## Output Formats

Most commands accept `format=json|csv|tsv|md|tree`. Use `format=json` for programmatic processing, `format=md` for human-readable output.

---

## When to Use CLI vs Direct Filesystem

| Situation | Recommended Approach |
|-----------|---------------------|
| Reading notes in Matt's Vault | Obsidian CLI (`obsidian read`) |
| Searching notes in Matt's Vault | Obsidian CLI (`obsidian search`) |
| Appending to existing notes | Obsidian CLI (`obsidian append`) |
| Creating notes in Matt's Vault | Obsidian CLI (`obsidian create`) |
| Creating files in CCL at known paths | Direct filesystem write (faster, no open-vault requirement) |
| Bulk writes to CCL (doc-harvest) | Direct filesystem write |
| Obsidian is not running | Direct filesystem write (fallback) |

---

## Error Patterns

- **Command hangs with no output** — Obsidian is not running, or the vault is not open. Check with `obsidian vaults` first.
- **Results from wrong vault** — `vault=` silently fell back to active vault. Open the target vault first with the `obsidian://open` URL scheme.
- **`-1712 AppleEvent timeout`** — Mac screen is locked. Unlock before running CLI commands.
- **`obsidian help` opens Obsidian** — this is a known bug; avoid.

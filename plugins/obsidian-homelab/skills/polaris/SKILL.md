---
name: polaris
description: Read Matt's current priorities, goals, and values from 01-Polaris/ to align suggestions with his actual focus. Use when asked about what to work on, generating idea reports, checking goal alignment, or surfacing priorities. Also use before making any significant recommendation so it's anchored to Matt's actual goals.
---

# Polaris

`01-Polaris/` is the AI navigation anchor for Matt's Vault. Read it FIRST before making recommendations, suggesting work, or generating idea reports. It prevents AI drift by grounding all suggestions in Matt's actual priorities.

---

## Vault Location

```
~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Matt's Vault/01-Polaris/
```

---

## Files

| File | Purpose | Key sections |
|------|---------|-------------|
| `_index.md` | AI navigation anchor overview — explains Polaris system, how to use it, links to other files | System overview, navigation guide |
| `Top-of-Mind.md` | Current priorities snapshot | **Active Focus** (what Matt is working on now), **Upcoming** (next 1–4 weeks), **Parking Lot** (good ideas, not now) |
| `Goals.md` | Goal inventory across time horizons | **Short-Term** (weeks/months), **Medium-Term** (6–18 months), **Long-Term** (years) — each with checkboxes |
| `Values.md` | Stable principles that filter decisions | **Core Values**, **Decision-Making Principles**, **What I Optimize For** |

---

## Workflow: Reading Polaris

Read all four files before making any significant recommendation:

```bash
# 1. Read the navigation overview
obsidian read "01-Polaris/_index.md" vault="Matt's Vault"

# 2. Read current priorities
obsidian read "01-Polaris/Top-of-Mind.md" vault="Matt's Vault"

# 3. Read goals
obsidian read "01-Polaris/Goals.md" vault="Matt's Vault"

# 4. Read values (optional for quick checks, required for life decisions)
obsidian read "01-Polaris/Values.md" vault="Matt's Vault"
```

For a quick priority check (most common case):

```bash
obsidian read "01-Polaris/Top-of-Mind.md" vault="Matt's Vault"
```

---

## Workflow: Generating an Idea Report

Bedford-style alignment report: surface what's genuinely worth doing, filtered by actual priorities.

**Step 1 — Read Top-of-Mind**
```bash
obsidian read "01-Polaris/Top-of-Mind.md" vault="Matt's Vault"
```
Extract: Active Focus items and Upcoming items.

**Step 2 — Read Goals**
```bash
obsidian read "01-Polaris/Goals.md" vault="Matt's Vault"
```
Extract: unchecked short-term and medium-term goals.

**Step 3 — Cross-reference with active projects**
```bash
obsidian files path="40-Projects/" vault="Matt's Vault" format=json
```
Scan project note titles. Look for notes whose names match Active Focus items or goal keywords.

**Step 4 — Read Values to filter**
```bash
obsidian read "01-Polaris/Values.md" vault="Matt's Vault"
```
Apply the "life razor": use Values to discard ideas that are interesting but misaligned.

**Step 5 — Generate report**

Structure the output as:
- **Aligned with Active Focus** — actions that directly advance current sprint
- **Advances a Goal** — actions that check off short/medium-term goals
- **Parking Lot candidates** — ideas that are good but not aligned right now
- **Explicitly deprioritized** — anything contradicted by Values or Parking Lot

---

## Workflow: Updating Polaris

### Update Top-of-Mind.md

Use `obsidian append` to add items without overwriting:
```bash
obsidian append "01-Polaris/Top-of-Mind.md" vault="Matt's Vault" content="
- New item to add to Active Focus or Upcoming"
```

For structural rewrites (e.g., closing out a sprint), read first, edit in memory, then use `obsidian create` with `overwrite=true`:
```bash
obsidian create name="01-Polaris/Top-of-Mind" content="<full updated content>" vault="Matt's Vault" overwrite=true
```

### Update Goals.md checkboxes

Read the file, locate the goal, mark it done:
```bash
# Read current state
obsidian read "01-Polaris/Goals.md" vault="Matt's Vault"

# Then write the updated version
obsidian create name="01-Polaris/Goals" content="<updated content with checkbox checked>" vault="Matt's Vault" overwrite=true
```

### Update Values.md

Values change rarely (quarterly at most). Always read first, make minimal edits, write back. Do not add transient items to Values.md — it is for stable principles only.

---

## Design Principles

**Why Polaris exists:** Most AI assistance fails because it optimizes for interesting rather than aligned. Without a stable reference, Claude suggests good ideas that are wrong for this person at this time. Polaris prevents that.

**How it prevents AI drift:** By reading Polaris before generating suggestions, Claude anchors recommendations to Matt's stated focus rather than to what seems broadly useful or intellectually interesting.

**The life razor:** Values.md is a filter, not a to-do list. When evaluating whether to recommend something, ask: does this contradict Matt's values? Does it pull attention away from Active Focus? If yes, route it to Parking Lot — not the report.

**Top-of-Mind is ephemeral, Goals are durable:** Top-of-Mind changes weekly; Goals change monthly or less. Don't conflate them. A task that isn't in Top-of-Mind but advances a Goal is still valid — surface it as a Goal-advancing suggestion, not an Active Focus item.

**Parking Lot is not a trash can:** Items in Parking Lot were deliberately deferred. Don't resurface them unless the Active Focus or Goals explicitly make them relevant again.

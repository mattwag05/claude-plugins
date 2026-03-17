---
name: daily-workflows
description: Run Matt's recurring daily and weekly routines — morning briefing, vault triage, weekly Polaris review, and session completion checklist. Use when asked to run a morning briefing, process inbox notes, do a weekly review, or wrap up a work session.
---

# Daily Workflows

This skill orchestrates Matt's recurring routines across Obsidian, Pippin, Telegram, and the homelab. Each workflow below can be triggered by name.

---

## Morning Briefing (`/morning-briefing`)

The morning briefing aggregates mail, calendar, and tasks into a plain-text Telegram message.

### Prerequisites
- Mac screen must be unlocked (SSH from iPhone may hit locked screen — check `ioreg -n IOHIDSystem | grep HIDIdleTime`)
- Mail.app must be open: `open -a Mail && sleep 4`
- Obsidian must be running (for task pull)

### Steps

1. **Gather mail** — pull unread from all accounts in parallel using Pippin:
   ```bash
   pippin mail unread --account iCloud --limit 10 --format json
   pippin mail unread --account Exchange --limit 10 --format json
   # repeat for Yahoo!, Google, mattwag0766@gmail.com
   ```

2. **Gather calendar** — use Pippin calendar or JXA fallback:
   ```bash
   pippin calendar today --format json
   # JXA fallback if Pippin fails:
   # osascript -l JavaScript -e '<JXA script>'
   ```

3. **Pull open tasks from vault**:
   ```bash
   obsidian tasks vault="Matt's Vault" format=md
   ```

4. **Compose plain-text message** — no Markdown formatting (Telegram silently drops messages with `_` or `*`). Structure:
   ```
   Good morning! Here's your briefing for <date>.

   CALENDAR
   <event list>

   MAIL (<N> unread)
   <sender — subject, per account>

   OPEN TASKS
   <task list, top 5>
   ```

5. **Send via Telegram**:
   ```bash
   CHAT_ID=$(get-secret "Personal AI Telegram Chat ID")
   BOT_TOKEN=$(get-secret "Personal AI Telegram Bot Token")
   curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
     -d chat_id="$CHAT_ID" \
     -d text="<message>"
   ```

---

## Vault Inbox Triage (`/vault-triage`)

Process notes sitting in `00-Inbox/` and move them to their correct folders.

### Steps

1. List inbox contents:
   ```bash
   obsidian files path="00-Inbox/" vault="Matt's Vault" format=json
   ```

2. For each note:
   - Read it: `obsidian read "00-Inbox/<name>" vault="Matt's Vault"`
   - Determine correct folder using vault-navigator skill
   - Check/add required frontmatter (type, tags, created) using obsidian-markdown skill
   - Move: `obsidian move "00-Inbox/<name>" "<target-folder>/<name>" vault="Matt's Vault"`

3. Report: list of notes processed and where each landed.

---

## Weekly Polaris Review (`/weekly-review`)

A structured review of the past week and planning for the next.

### Steps

1. **Read last week's plan**:
   ```bash
   obsidian files path="01-Polaris/Weeks/" vault="Matt's Vault" format=json
   # read most recent Week-*.md
   ```

2. **Check open tasks**:
   ```bash
   obsidian tasks vault="Matt's Vault" format=md
   ```

3. **Review Anchors** — read each Anchor note and note any updates needed.

4. **Compose new week plan** using the polaris skill's Week Plan template.

5. **Create the week plan note**:
   ```bash
   obsidian create name="01-Polaris/Weeks/Week-<YYYY-WNN>" content="..." vault="Matt's Vault" silent
   ```

6. **Optional: write brief reflection** for the closing week:
   ```bash
   obsidian create name="01-Polaris/Reflections/Reflection-<YYYY-MM>" content="..." vault="Matt's Vault" silent
   ```

---

## Session Completion Checklist (`/session-done`)

Run at the end of any coding or infrastructure work session. From `~/.claude/CLAUDE.md`:

1. File issues for remaining work:
   ```bash
   bd create "Title" --description "..." --status open
   ```

2. Run quality gates (tests, linters) if code changed.

3. Update issue status:
   ```bash
   bd close <id>              # finished work
   bd update <id> --status in_progress  # ongoing
   ```

4. Push:
   ```bash
   git stash && git pull --rebase && git stash pop && bd sync && git push
   ```

5. Verify `git status` shows "up to date with origin".

Work is not complete until `git push` succeeds.

---

## Telegram Helpers

```bash
# Get credentials
CHAT_ID=$(get-secret "Personal AI Telegram Chat ID")
BOT_TOKEN=$(get-secret "Personal AI Telegram Bot Token")

# Send a plain-text message
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="$CHAT_ID" \
  -d text="<message>"
```

**Plain text only** — `parse_mode: "Markdown"` was removed 2026-02-25 because Telegram silently drops messages containing underscores or asterisks. Always send plain text.

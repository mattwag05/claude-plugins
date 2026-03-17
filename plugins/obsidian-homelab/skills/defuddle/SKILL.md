---
name: defuddle
description: Extract clean, readable content from web pages using the defuddle CLI. Strips navigation, ads, and clutter to get the core article content. Use when fetching a single web page for note-taking or research. For full documentation site harvests (entire libraries), use the doc-harvest plugin instead.
---

# Defuddle

Defuddle extracts clean article content from a web URL — stripping navigation, ads, sidebars, and other clutter. It is the right tool for turning a single web page into a clean Markdown note.

---

## Installation

```bash
npm install -g defuddle-cli
```

Check if already installed:
```bash
defuddle --version
```

---

## Basic Usage

### Extract as Markdown (recommended)
```bash
defuddle parse <url> --md
```

### Save to file
```bash
defuddle parse <url> --md -o content.md
```

### Get a specific metadata property
```bash
defuddle parse <url> -p title
defuddle parse <url> -p domain
defuddle parse <url> -p author
defuddle parse <url> -p published
defuddle parse <url> -p description
```

### Output as JSON (includes all metadata + content)
```bash
defuddle parse <url> --json
```

### Output as HTML
```bash
defuddle parse <url> --html
```

---

## Integration Pattern: Web Article to Vault Note

The fastest pattern for archiving a single web article into Matt's Vault:

1. Extract content with defuddle
2. Wrap in frontmatter using the obsidian-markdown skill's standard template
3. Write to vault using obsidian-cli

```bash
# Step 1: get title and content
TITLE=$(defuddle parse "https://example.com/article" -p title)
defuddle parse "https://example.com/article" --md -o /tmp/article.md

# Step 2: prepend frontmatter (use Write tool, not echo)
# Step 3: create in vault
obsidian create name="$TITLE" vault="Matt's Vault" content="$(cat /tmp/article.md)"
```

---

## When to Use Defuddle vs Other Tools

| Use case | Tool |
|----------|------|
| Single web article → vault note | `defuddle` |
| Entire documentation site (Apple HIG, library docs) | `doc-harvest` plugin |
| Web page that requires JavaScript rendering | WebFetch tool (browser-based) |
| Already have clean text, just need to write to vault | `obsidian-cli` skill directly |

---

## Notes

- Defuddle works best on article-style pages (blog posts, documentation pages, news articles).
- It does not execute JavaScript — purely HTML parsing. SPA sites that require JS rendering will yield empty or minimal content. Use WebFetch for those.
- For SPA-rendered documentation sites (e.g., Apple Developer docs), the `doc-harvest` plugin has specialized handling via JSON API discovery.

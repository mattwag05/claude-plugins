# Known Contexts — Claude Context Library

All context files currently in the CCL vault at:
`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Claude Context Library/`

| File path | Domain | Description | Last Updated |
|-----------|--------|-------------|-------------|
| contexts/medical/clinical-writing.md | Medical | SOAP notes, discharge summary patterns | 2026-03-07 |
| contexts/technical/code-documentation.md | Technical | READMEs, API docs, code comment patterns | 2026-01-19 |
| contexts/technical/pihole-config.md | Homelab | Dual Pi-hole, Unbound, nebula-sync config | 2026-03-07 |
| contexts/obsidian/vault-conventions.md | Obsidian | Vault structure, tagging, file placement | 2026-03-07 |
| contexts/technical/apple-hig/ | Apple/iOS | Apple HIG — 169 pages, full site harvest | 2026-03-08 |

---

## Registration Pattern

Each context is registered in `known-docs.md` in the CCL vault root. Entry format:

```markdown
## <name>

- **path**: contexts/<domain>/<filename>.md (or folder/)
- **description**: One sentence describing what this context provides
- **last_updated**: YYYY-MM-DD
- **triggers**: comma-separated keywords that should cause Claude to load this context
```

Example entry:
```markdown
## pihole-config

- **path**: contexts/technical/pihole-config.md
- **description**: Dual Pi-hole setup (Pironman primary, Pi secondary), Unbound, nebula-sync config
- **last_updated**: 2026-03-07
- **triggers**: pihole, dns, ad-blocker, unbound, nebula-sync
```

---

## Adding a New Context

1. Determine the domain folder: `medical/`, `technical/`, `obsidian/`, or a new domain subfolder
2. Create the file using the `templates/new-context.md` template in the CCL vault root:
   ```bash
   obsidian read "templates/new-context.md" vault="Claude Context Library"
   ```
3. Write focused, machine-readable content — Claude will read this, not a human
4. Create the file in the CCL vault:
   ```bash
   obsidian create name="contexts/<domain>/<filename>" content="<content>" vault="Claude Context Library"
   ```
5. Register in `known-docs.md`:
   ```bash
   obsidian append "known-docs.md" vault="Claude Context Library" content="
   ## <name>

   - **path**: contexts/<domain>/<filename>.md
   - **description**: ...
   - **last_updated**: YYYY-MM-DD
   - **triggers**: keyword1, keyword2, keyword3"
   ```
6. Note the triggers — keywords that should cause Claude to load this context

---

## Content Guidelines

- Write for Claude, not humans — concise, structured, minimal prose
- Use headers and code blocks liberally
- Include examples of correct patterns, not just descriptions
- Keep each context to one domain — don't mix medical and technical in one file
- For large harvests (e.g., full docs site), use a subdirectory (e.g., `apple-hig/`) with an `_index.md` and per-section files
- Apple HIG harvest pattern: the site is a SPA, but content is served via JSON API:
  ```
  https://developer.apple.com/tutorials/data/design/human-interface-guidelines/{slug}.json
  ```
  Use WebFetch on this URL instead of browser navigation for bulk content scraping
- Target file size: 200–800 lines for single-file contexts; no limit for folder-based harvests

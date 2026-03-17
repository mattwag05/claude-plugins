# Properties (Frontmatter)

## Syntax
YAML between `---` delimiters at the top of the file.

## Standard frontmatter for Matt's Vault

Required fields:
- `type`: Note type (e.g., runbook, project, soap-note, polaris, template)
- `tags`: List of tags
- `created`: Creation date (YYYY-MM-DD)

Optional fields:
- `updated`: Last modified date
- `status`: active | paused | completed | archived
- `priority`: high | medium | low
- `parent`: Wikilink to parent note

## Property types
Text, Number, Checkbox (true/false), Date (2024-01-15), Date & Time, List, Links ("[[Other Note]]")

## Default properties
- `tags` — searchable
- `aliases` — link suggestions
- `cssclasses` — applied in read/edit view

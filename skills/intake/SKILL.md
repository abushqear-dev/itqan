---
name: intake
description: Collect and register the inputs for an Itqan project. Use at the start of a new Itqan project, or when the user supplies, links, pastes or changes a Business Requirements Document (BRD) or Vision Document. Finds the inputs, asks for them if missing, brings them into docs/input/, classifies them, rules on conflicts and records them.
---

# Intake

Goal: at least one BRD or Vision Document saved in `docs/input/`, classified and recorded, with any conflict ruled on. State tool: `node "${CLAUDE_PLUGIN_ROOT}/scripts/itq.mjs"`.

## 1. Look first
List `docs/input/` and read what is there.

## 2. Nothing usable? Ask
Do not start any document and do not invent a product. Ask for a BRD (goals, stakeholders, scope, constraints), a Vision Document (who it is for, what it does, why it matters), or both. They can come as a file (a path, or dropped into `docs/input/`), a link, or pasted text. If the user only has an idea, offer to turn up to five answers into a minimal Vision Document (who it is for, the problem, the three things it must do, what is out of scope, hard constraints), and get approval of that text before recording it.

## 3. Bring each input into `docs/input/`
Never edit the user's original.
- **File elsewhere:** copy it in and say so.
- **Markdown or text:** use as is.
- **PDF:** read it (use `pages` for long files), save the text as `docs/input/<name>.md` next to the PDF.
- **Word or other office file:** convert with `pandoc` if available; otherwise ask for a PDF, Markdown or text export.
- **Pasted text:** ask whether it is a BRD or a Vision, then write it to `docs/input/brd.md` or `vision.md` exactly as given.
- **Link:** fetch it and save it as Markdown with a first line `Source: <url>, retrieved <date>`. If the page is private and no connected tool can read it, say plainly that you could not read it and ask for an export. Never describe content you did not read.

Several overlapping drafts or a very long document: summarise and ask which version is current.

## 4. Classify, record, rule
1. Classify each file as `brd`, `vision` or neither. Report files that are neither and leave them out.
2. Record each accepted file: `itq.mjs record-input docs/input/<file> <brd|vision> "<original path, url or 'pasted'>"`.
3. With both a BRD and a Vision, compare scope, users, goals and constraints. If they conflict, ask which governs (or whether both are in scope), explaining the impact, and record it with `itq.mjs ruling "<text>"`; otherwise `itq.mjs ruling "no conflict"`. Never merge them silently.
4. Summarise in two or three lines and hand back to `itqan:start` for stage D (Discovery).

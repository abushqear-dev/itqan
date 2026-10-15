---
name: status
description: Show where an Itqan project stands. Use when the user asks for status, progress or which stage they are on.
---

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/itq.mjs" status` and report in one or two lines: the current stage, its status, and what the user needs to do next. If there is no `.itqan/` folder, say this is not an Itqan project and offer `/itqan:start`.

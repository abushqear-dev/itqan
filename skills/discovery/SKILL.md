---
name: discovery
description: Stage D of Itqan, before the Constitution. Researches the market the product enters (3-5 real competitors with cited sources, table-stakes features, personas and jobs, positioning) and writes docs/00-discovery.md. Use when Itqan reaches stage D or the user asks for competitor, market or positioning research.
---

# Stage D: Discovery

Follow `${CLAUDE_PLUGIN_ROOT}/skills/start/loop.md`. Template: `${CLAUDE_PLUGIN_ROOT}/templates/discovery.md`. Inputs: the recorded BRD and/or Vision and the ruling.

Why this stage exists: "what comparable products offer" is otherwise judged from model memory. Discovery gives later stages a researched, cited baseline, and the final product is measured against it (Sell Standard Index).

## Research rules (adapted from the BMAD Method's deep-recon rules, MIT; see NOTICES.md)
1. **No market fact from model memory alone.** Every fact about a competitor comes from a page you fetched this session.
2. **A claim is a sentence with a source:** URL and the ISO date you accessed it. A matrix cell without both fails the check.
3. **The project's own files are never evidence about competitors.** The Vision says what the user wants, not what the market has.
4. **Freshness:** pricing and features within 90 days of today, sentiment (reviews) within 12 months.
5. **Two independent domains** for any claim that a feature is table stakes or that a differentiator is real; otherwise mark it a hypothesis.
6. **Rate from reviews and the product's own help pages, not marketing claims.** Scale: Strong, Adequate, Weak, Absent. Competitor levels: direct, indirect, adjacent, substitute.
7. If web research is unavailable, say so and stop: do not fill the matrix from memory. Ask the user for competitor names and pages, or set `Mode: workaround` with the current way of working as the only competitor.

## Order of work
1. **Mode.** `full` (3-5 competitors) by default. `light` when the inputs already contain a market analysis (read it first and cite it). `workaround` for internal tools with no market: the current way of working (a spreadsheet, email, paper) is competitor 1.
2. **Find competitors.** Search for the product category and the jobs in the inputs; pick 3-5 products real users choose between, including at least one direct competitor. Ask the user which ones matter to them in the one question batch.
3. **Feature matrix.** One row per feature seen on any competitor's own pages or reviews, one column per competitor. A feature present (not Absent) in at least 60% of competitors is **table stakes**: mark the last column `yes`. Give each feature a Kano class (must-be, performance, attractive).
4. **Table-stakes rulings.** One line per table-stakes feature under "Table stakes: rulings". The ruling is the user's own: `in scope`, `later` or `dropped`. Ask in the question batch with a recommended answer (keep it unless the inputs rule it out). `pending` blocks approval. A "you decide" never settles a ruling to `dropped`.
5. **Personas and jobs.** At most four personas, taken from the inputs and from what reviews show about who uses these products. Jobs are written as verb + object + context, each with an `Outcome: Minimize the time/likelihood/effort ...` statement.
6. **Positioning** in all six slots (for, who, the product is a, that, unlike, our product), and differentiators backed by two sources or marked as hypotheses.
7. **Sources and freshness** lists every URL with its date.

## Gate
`itq.mjs check D` passes (3-5 competitors with URL and date, every matrix cell sourced and dated, table stakes marked, every table-stakes ruling given by the user, Moore slots filled, at most four personas each used by a job, jobs with outcomes, no clarification markers), then `itq.mjs score D --online` (cited URLs must answer; sampled claims are judged with rubric R1), the review is clean, the review card is shown, and the user approves.

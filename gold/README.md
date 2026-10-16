# Gold sets

Ground truth for calibrating Itqan's judges (see `calibration-plan.md`). A judge metric may be counted or used as a gate only after `scripts/calibrate.mjs` scores it against a set here.

## Layout

```
gold/<set>/
  items/            what the judge or grader sees: g001.md, g002.md, ... or g001.png
  truth.json        ground truth, one entry per item (never shown to the judge)
  set.json          optional: { "rubric": "R2", "title": "...", "dimensions": ["Hierarchy", ...] }
```

Set names follow the plan: `G-R1`, `G-R2`, `G-R2K`, `G-R3`, `G-R4`, `G-R5`, `G-R6`, `G-R7`, `G-R8`, `G-PG7`.

Rules:
- Item ids are neutral (`g001`). A name such as `defect-03` would reveal the answer to a person or a judge.
- Reference examples copied into a rubric are removed from the scoring set.
- Pair sets use `g001.a.png` and `g001.b.png` (or `.md`) for the two sides.

## truth.json

An array. Each entry has the fields for its kind of truth:

| Kind | Entry | Used for |
|---|---|---|
| graded | `{ "id", "level": 1-5, "dimension"?, "group"? }` | Weighted kappa, alpha, rho. `dimension` gives kappa per dimension; items with the same `group` are summed for rho on totals |
| defect | `{ "id", "defect": true, "type", "location" }` or `{ "id", "defect": false }` | Recall on planted defects, false alarms on clean originals |
| fact | `{ "id", "label": "supported" }` | Agreement (R1) |
| pair | `{ "id", "choice": "A" \| "B" \| "Tie" }` | Agreement ignoring ties (R7) |

`scripts/seed-defects.mjs` writes defect truth, with extra `source` metadata.

## Judge output

An array, or `{ "model", "prompt_hash", "items": [...] }` (preferred: the model and prompt hash go into the calibration file).

- graded: `{ "id", "level" }`
- defect: `{ "id", "flagged": true | false }`
- fact: `{ "id", "label" }`
- pair: `{ "id", "choice", "choice_swapped" }`, the verdicts for the two presentation orders, both in the original labels. If they differ the verdict is Tie and it counts as a flip.

Human grades (`grades-<name>.json` from the grading page) are `[{ "id", "level" | "choice", "dimension"?, "evidence", "seconds" }]` and can be passed as `--human-a` and `--human-b`.

## Commands

```
node scripts/seed-defects.mjs --from <clean spec.md[,more.md]> --out gold/G-R2 [--n 20] [--seed 1]
node scripts/grading-page.mjs build --set gold/G-R3 --out grading/G-R3.html
node scripts/calibrate.mjs --truth gold/G-R2/truth.json --judge runs/R2-judge.json --rubric R2 \
    [--human-a grades-a.json --human-b grades-b.json] --out rubrics/R2.calibration.json
node tests/calibrate.test.mjs
```

`calibrate.mjs` prints the decision (`advisory`, `counted`, `gate`, or `anchors-need-rewrite`) and writes the calibration file: `{ rubric, version, judge: {model, prompt_hash}, n, metrics (each with value, lo, hi), decision, checks, hash, at }`. The `hash` covers the rubric file text, the model and the prompt hash; `itq.mjs score` recomputes it (`calibrationHash` is exported) and treats a mismatch as advisory.

## Seeded defects

`seed-defects.mjs` plants one defect per copy of a clean Product Spec, spread over eight types: design detail in a criterion, contradiction with another criterion, infeasible limit, second reading, compound response, missing Example, vague NFR, undefined role. Items are whole specs; the clean original is written once per source file. Pass several clean specs (comma separated) so that false alarms are measured on more than one clean text. Same inputs and `--seed` give identical files.

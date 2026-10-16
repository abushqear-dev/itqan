# Rules for every judge

Read before any rubric. Calibration: see plans/calibration-plan.md; a judge metric counts only when its rubric has a calibration record that matches the rubric file.

1. **Independence.** Run in a fresh agent, with a model family different from the author's where one is available. Read only the artefact, its inputs and this rubric, never the author's reasoning or earlier scores.
2. **Evidence before score.** For each item: quote or point to the evidence, then give the level. A score with no evidence counts as the lowest level.
3. **Anchors.** Levels 1, 3 and 5 are defined below; 2 and 4 sit between them. Each rubric file also carries one or two reference examples per anchor, taken from the gold set. These are added after the gold set exists; UICrit's few-shot result is the reason.
4. **Three samples, median.** Run three times with fixed settings and take the median per item. A spread of more than 1 point on any item is flagged on the card as "judge unsure".
5. **Output.** JSON lines, `{ "item": "<id>", "evidence": "...", "level": n }`, then one summary line. No preamble.
6. **Versioning.** Every rubric has a version. The score file records the rubric version, model ID and prompt hash. Any change means re-calibration.


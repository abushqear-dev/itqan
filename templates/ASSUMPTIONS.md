# Assumptions

Every assumption the agent makes, with the stage that made it and what it means for users. Reviewed at each approval through the review card (`itq.mjs card <n>`).

| ID | Stage | Assumption | Consequence for users | Tag | Status |
|----|-------|------------|-----------------------|-----|--------|

- **Consequence:** what a user can or cannot do because of it, in plain words (e.g. "a mistaken shift cannot be fixed; the coordinator must contact volunteers").
- **Tag:** `scope-cut` when the assumption removes or omits a capability users of comparable products expect; otherwise empty.
- **Status:** `open` (not yet answered), `accepted` (the document was approved without the user answering it individually), `confirmed` (the user explicitly agreed), `replaced` (the user decided otherwise).
- A `scope-cut` assumption can never be `accepted`: it needs the user's own answer (`confirmed` or `replaced`). If the user does not answer, keep the capability instead (as a P2 story) and record that.
